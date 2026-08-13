import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { catchError, of, switchMap } from 'rxjs';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroTrash, heroHeart, heroCalendarDays, heroUser, heroExclamationTriangle, heroSparkles } from '@ng-icons/heroicons/outline';
import { GetAppointmentsUseCase } from '../../application/get-appointments.usecase';
import { CreateAppointmentUseCase } from '../../application/create-appointment.usecase';
import { UpdateAppointmentUseCase } from '../../application/update-appointment.usecase';
import { CheckAvailabilityUseCase } from '../../application/check-availability.usecase';
import {
  Appointment,
  AppointmentStatus,
  CalendarSlot,
  Dentist,
} from '../../domain/appointment';
import { User } from '../../../users/domain/user';
import { UserRepository } from '../../../users/infrastructure/user-api.repository';
import { AuthService } from '../../../../core/services/auth';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarDay {
  date: Date;
  label: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-calendar',
  imports: [
    Modal,
    NgIcon,
    ReactiveFormsModule,
    DatePipe,
  ],
  providers: [
    provideIcons({ heroTrash, heroHeart, heroCalendarDays, heroUser, heroExclamationTriangle, heroSparkles })
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly createAppointment = inject(CreateAppointmentUseCase);
  private readonly updateAppointment = inject(UpdateAppointmentUseCase);
  private readonly checkAvailability = inject(CheckAvailabilityUseCase);
  private readonly toast = inject(ToastService);
  private readonly userRepository = inject(UserRepository);
  private readonly auth = inject(AuthService);

  readonly canManageAppointments = computed(() => {
    const roles = this.auth.roles();
    return roles.includes('admin') || roles.includes('receptionist');
  });

  readonly view = signal<CalendarView>('week');
  readonly currentDate = signal(new Date());
  readonly selectedDentistId = signal<string | null>(null);
  readonly startHour = signal(8);
  readonly endHour = signal(20);
  readonly appointmentDuration = signal(30);
  readonly appointments = signal<Appointment[]>([]);
  readonly availableDentists = signal<Dentist[]>([]);
  readonly loading = signal(false);

  readonly modalVisible = signal(false);
  readonly modalTitle = signal('Nueva cita');
  readonly editingAppointment = signal<Appointment | null>(null);

  readonly detailModalVisible = signal(false);
  readonly selectedAppointment = signal<Appointment | null>(null);

  readonly form = new FormGroup({
    patientName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    patientId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dentistId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dentistName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    scheduledDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    scheduledTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    uiStatus: new FormControl('scheduled', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly dentists = computed<Dentist[]>(() => {
    const seen = new Map<string, Dentist>();
    for (const dentist of this.availableDentists()) {
      seen.set(dentist.id, dentist);
    }
    for (const a of this.appointments()) {
      if (a.dentistId && !seen.has(a.dentistId)) {
        seen.set(a.dentistId, {
          id: a.dentistId,
          name: a.dentistName ?? a.dentistId,
        });
      }
    }
    return Array.from(seen.values());
  });

  readonly filteredAppointments = computed<Appointment[]>(() => {
    const all = this.appointments();
    const dentist = this.selectedDentistId();
    let result = all.filter(a => a.status !== 'cancelled');
    if (dentist) {
      result = result.filter((a) => a.dentistId === dentist);
    }
    return result;
  });

  readonly hours = computed<number[]>(() =>
    Array.from(
      { length: this.endHour() - this.startHour() + 1 },
      (_, i) => this.startHour() + i,
    ),
  );

  readonly weekDays = computed<CalendarDay[]>(() => {
    const date = this.currentDate();
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        label: this.weekDayLabel(d),
        isToday: d.getTime() === today.getTime(),
        isCurrentMonth: true,
        appointments: this.getAppointmentsForDate(d),
      };
    });
  });

  readonly dayAppointments = computed<Appointment[]>(() => {
    const date = this.currentDate();
    return this.getAppointmentsForDate(date);
  });

  readonly monthGrid = computed<CalendarDay[][]>(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = (firstDay.getDay() + 6) % 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: CalendarDay[] = [];

    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(year, month, -startOffset + i + 1);
      cells.push({
        date: prevDate,
        label: String(prevDate.getDate()),
        isToday: false,
        isCurrentMonth: false,
        appointments: [],
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cellDate = new Date(year, month, d);
      cells.push({
        date: cellDate,
        label: String(d),
        isToday: cellDate.getTime() === today.getTime(),
        isCurrentMonth: true,
        appointments: this.getAppointmentsForDate(cellDate),
      });
    }

    while (cells.length % 7 !== 0) {
      const nextD = cells.length - startOffset + 1;
      const nextDate = new Date(year, month + 1, nextD);
      cells.push({
        date: nextDate,
        label: String(nextDate.getDate()),
        isToday: false,
        isCurrentMonth: false,
        appointments: [],
      });
    }

    const rows: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return rows;
  });

  private getAppointmentsForDate(date: Date): Appointment[] {
    return this.filteredAppointments().filter((a) => {
      const d = new Date(a.scheduledAt);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDoctors();
      this.loadAppointments();
    }
  }

  loadDoctors() {
    this.userRepository.findAll()
      .pipe(catchError(() => of([])))
      .subscribe((users) => {
        this.availableDentists.set(
          users
            .filter((user) => this.isDoctor(user))
            .map((user) => ({ id: String(user.id), name: user.nombreCompleto })),
        );
      });
  }

  loadAppointments() {
    this.loading.set(true);
    this.getAppointments
      .execute()
      .pipe(
        catchError(() => of([])),
      )
      .subscribe((data) => {
        this.appointments.set(data);
        this.loading.set(false);
      });
  }

  setView(view: CalendarView) {
    this.view.set(view);
  }

  goToToday() {
    this.currentDate.set(new Date());
  }

  navigate(delta: number) {
    this.currentDate.update((d) => {
      const next = new Date(d);
      const view = this.view();
      if (view === 'day') {
        next.setDate(next.getDate() + delta);
      } else if (view === 'week') {
        next.setDate(next.getDate() + delta * 7);
      } else {
        next.setMonth(next.getMonth() + delta);
      }
      return next;
    });
  }

  viewTitle(): string {
    const d = this.currentDate();
    const view = this.view();
    if (view === 'day') {
      return d.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (view === 'week') {
      return `Semana del ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  }

  openCreateModal(slotDate?: Date, slotTime?: string) {
    if (!this.canManageAppointments()) return;

    this.editingAppointment.set(null);
    this.modalTitle.set('Nueva cita');
    this.form.reset();

    if (slotDate) {
      this.form.patchValue({
        scheduledDate: slotDate.toISOString().slice(0, 10),
        uiStatus: 'scheduled',
      });
    }
    if (slotTime) {
      this.form.patchValue({ scheduledTime: slotTime });
    }

    const selectedDentist = this.selectedDentistId();
    const dentist = this.dentists().find((d) => d.id === selectedDentist);
    if (dentist) {
      this.form.patchValue({
        dentistId: dentist.id,
        dentistName: dentist.name,
      });
    }

    this.modalVisible.set(true);
  }

  openEditModal(appointment: Appointment) {
    this.editingAppointment.set(appointment);
    this.modalTitle.set('Actualización de la cita');

    const d = new Date(appointment.scheduledAt);
    const scheduledDate = this.dateKey(d);
    const scheduledTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    this.form.setValue({
      patientName: appointment.patientName,
      patientId: appointment.patientId,
      dentistId: appointment.dentistId ?? '',
      dentistName: appointment.dentistName ?? '',
      scheduledDate,
      scheduledTime,
      reason: appointment.reason,
      uiStatus: appointment.status,
    });

    this.modalVisible.set(true);
  }

  closeModal() {
    this.modalVisible.set(false);
    this.form.reset();
  }

  openDetailModal(appointment: Appointment) {
    this.selectedAppointment.set(appointment);
    this.detailModalVisible.set(true);
  }

  closeDetailModal() {
    this.detailModalVisible.set(false);
    this.selectedAppointment.set(null);
  }

  statusLabel(status?: string): string {
    if (status === 'completed') return 'Atendida';
    if (status === 'cancelled') return 'Cancelada';
    return 'Pendiente';
  }

  statusClass(status?: string): string {
    if (status === 'completed') return 'appt-status-badge--completed';
    if (status === 'cancelled') return 'appt-status-badge--cancelled';
    return 'appt-status-badge--scheduled';
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formVal = this.form.getRawValue();
    const scheduledAt = new Date(`${formVal.scheduledDate}T${formVal.scheduledTime}:00`).toISOString();

    const existing = this.editingAppointment();

    if (existing) {
      let finalScheduledAt = existing.scheduledAt;
      let newStatus = formVal.uiStatus;

      if (formVal.uiStatus === 'rescheduled') {
        finalScheduledAt = scheduledAt;
        newStatus = 'scheduled';
      }

      this.updateAppointment
        .execute(existing.id, {
          scheduledAt: finalScheduledAt,
          reason: formVal.reason,
          patientId: formVal.patientId,
          patientName: formVal.patientName,
          dentistId: formVal.dentistId || undefined,
          dentistName: formVal.dentistName || undefined,
          status: newStatus as AppointmentStatus,
        })
        .pipe(
          catchError(() => {
            this.toast.error('No se pudo actualizar la cita.');
            return of(null);
          }),
        )
        .subscribe((appointment) => {
          if (appointment) {
            this.toast.success('Cita actualizada.');
            this.closeModal();
            this.loadAppointments();
          }
        });
      return;
    }

    const slot: CalendarSlot = {
      dentistId: formVal.dentistId,
      start: scheduledAt,
      end: this.addMinutes(scheduledAt, this.appointmentDuration()),
    };

    this.checkAvailability
      .execute(slot.dentistId, slot)
      .pipe(
        switchMap((result) => {
          if (!result.available) {
            this.toast.error(
              'El horario no está disponible. Este odontólogo ya tiene una cita en ese horario.',
            );
            throw new Error('Slot unavailable');
          }
          return this.createAppointment.execute({
            patientId: formVal.patientId,
            patientName: formVal.patientName,
            dentistId: formVal.dentistId || undefined,
            dentistName: formVal.dentistName || undefined,
            scheduledAt,
            reason: formVal.reason,
          });
        }),
        catchError((err) => {
          if (err.message !== 'Slot unavailable') {
            this.toast.error('No se pudo registrar la cita.');
          }
          return of(null);
        }),
      )
      .subscribe((appointment) => {
        if (appointment) {
          this.toast.success('Cita registrada.');
          this.closeModal();
          this.loadAppointments();
        }
      });
  }

  getStatusClass(status: AppointmentStatus): string {
    return `status--${status}`;
  }

  getAppointmentsForHour(date: Date, hour: number): Appointment[] {
    return this.filteredAppointments().filter((a) => {
      const d = new Date(a.scheduledAt);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate() && d.getHours() === hour;
    });
  }

  onHourClick(date: Date, hour: number) {
    if (!this.canManageAppointments()) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    this.openCreateModal(date, `${pad(hour)}:00`);
  }

  selectDentist(id: string | null) {
    this.selectedDentistId.set(id);
  }

  setStartHour(value: string) {
    const hour = Number(value);
    if (Number.isNaN(hour)) return;
    this.startHour.set(Math.min(hour, this.endHour() - 1));
  }

  setEndHour(value: string) {
    const hour = Number(value);
    if (Number.isNaN(hour)) return;
    this.endHour.set(Math.max(hour, this.startHour() + 1));
  }

  setAppointmentDuration(value: string) {
    const minutes = Number(value);
    if (Number.isNaN(minutes)) return;
    this.appointmentDuration.set(minutes);
  }

  formatHour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  private weekDayLabel(date: Date): string {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return `${date.getDate()} ${days[date.getDay()]}`;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addMinutes(isoString: string, minutes: number): string {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }

  private isDoctor(user: User): boolean {
    return user.estado !== false && user.roles.some((role) => {
      return role.nombreRol.toUpperCase() === 'MEDICO';
    });
  }
}
