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
import { FormField } from '../../../../shared/components/form-field/form-field';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { GetAppointmentsUseCase } from '../../application/get-appointments.usecase';
import { CreateAppointmentUseCase } from '../../application/create-appointment.usecase';
import { UpdateAppointmentUseCase } from '../../application/update-appointment.usecase';
import { CancelAppointmentUseCase } from '../../application/cancel-appointment.usecase';
import { CheckAvailabilityUseCase } from '../../application/check-availability.usecase';
import {
  Appointment,
  AppointmentStatus,
  CalendarSlot,
  Dentist,
} from '../../domain/appointment';

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
    DatePipe,
    Modal,
    FormField,
    ReactiveFormsModule,
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly createAppointment = inject(CreateAppointmentUseCase);
  private readonly updateAppointment = inject(UpdateAppointmentUseCase);
  private readonly cancelAppointment = inject(CancelAppointmentUseCase);
  private readonly checkAvailability = inject(CheckAvailabilityUseCase);
  private readonly toast = inject(ToastService);

  readonly view = signal<CalendarView>('week');
  readonly currentDate = signal(new Date());
  readonly selectedDentistId = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(false);

  readonly modalVisible = signal(false);
  readonly modalTitle = signal('New Appointment');
  readonly editingAppointment = signal<Appointment | null>(null);
  readonly cancelModalVisible = signal(false);
  readonly cancelTarget = signal<Appointment | null>(null);

  readonly cancelForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

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
  });

  readonly dentists = computed<Dentist[]>(() => {
    const seen = new Map<string, Dentist>();
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
    if (!dentist) return all;
    return all.filter((a) => a.dentistId === dentist);
  });

  readonly hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

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
        label: d.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
        }),
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
    const dateStr = date.toISOString().slice(0, 10);
    return this.filteredAppointments().filter((a) =>
      a.scheduledAt.startsWith(dateStr),
    );
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAppointments();
    }
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
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (view === 'week') {
      return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  openCreateModal(slotDate?: Date, slotTime?: string) {
    this.editingAppointment.set(null);
    this.modalTitle.set('New Appointment');
    this.form.reset();

    if (slotDate) {
      this.form.patchValue({
        scheduledDate: slotDate.toISOString().slice(0, 10),
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
    this.modalTitle.set('Edit Appointment');

    const scheduledDate = appointment.scheduledAt.slice(0, 10);
    const scheduledTime = appointment.scheduledAt.slice(11, 16);

    this.form.setValue({
      patientName: appointment.patientName,
      patientId: appointment.patientId,
      dentistId: appointment.dentistId ?? '',
      dentistName: appointment.dentistName ?? '',
      scheduledDate,
      scheduledTime,
      reason: appointment.reason,
    });

    this.modalVisible.set(true);
  }

  closeModal() {
    this.modalVisible.set(false);
    this.form.reset();
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formVal = this.form.getRawValue();
    const scheduledAt = `${formVal.scheduledDate}T${formVal.scheduledTime}:00`;

    const existing = this.editingAppointment();

    if (existing) {
      this.updateAppointment
        .execute(existing.id, {
          scheduledAt,
          reason: formVal.reason,
          patientId: formVal.patientId,
          patientName: formVal.patientName,
          dentistId: formVal.dentistId || undefined,
          dentistName: formVal.dentistName || undefined,
        })
        .pipe(
          catchError(() => {
            this.toast.error('Failed to update appointment.');
            return of(null);
          }),
        )
        .subscribe((appointment) => {
          if (appointment) {
            this.toast.success('Appointment updated.');
            this.closeModal();
            this.loadAppointments();
          }
        });
      return;
    }

    const slot: CalendarSlot = {
      dentistId: formVal.dentistId,
      start: scheduledAt,
      end: this.addMinutes(scheduledAt, 30),
    };

    this.checkAvailability
      .execute(slot.dentistId, slot)
      .pipe(
        switchMap((result) => {
          if (!result.available) {
            this.toast.error(
              'Slot is unavailable. This dentist already has an appointment at that time.',
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
            this.toast.error('Failed to create appointment.');
          }
          return of(null);
        }),
      )
      .subscribe((appointment) => {
        if (appointment) {
          this.toast.success('Appointment created.');
          this.closeModal();
          this.loadAppointments();
        }
      });
  }

  openCancelModal(appointment: Appointment) {
    this.cancelTarget.set(appointment);
    this.cancelForm.reset();
    this.cancelModalVisible.set(true);
  }

  closeCancelModal() {
    this.cancelModalVisible.set(false);
    this.cancelTarget.set(null);
    this.cancelForm.reset();
  }

  confirmCancel() {
    const target = this.cancelTarget();
    const reason = this.cancelForm.value.trim();
    if (!target) return;
    if (this.cancelForm.invalid) {
      this.cancelForm.markAsTouched();
      return;
    }

    this.cancelAppointment
      .execute(target.id, reason)
        .pipe(
          catchError(() => {
            this.toast.error('Failed to cancel appointment.');
            return of(null);
          }),
        )
      .subscribe((appointment) => {
        if (appointment) {
          this.toast.success('Appointment cancelled.');
          this.closeCancelModal();
          this.loadAppointments();
        }
      });
  }

  getStatusClass(status: AppointmentStatus): string {
    return `status--${status}`;
  }

  getAppointmentsForHour(date: Date, hour: number): Appointment[] {
    const pad = (n: number) => String(n).padStart(2, '0');
    const hourStr = pad(hour);
    const dateStr = date.toISOString().slice(0, 10);
    const prefix = `${dateStr}T${hourStr}`;
    return this.filteredAppointments().filter((a) =>
      a.scheduledAt.startsWith(prefix),
    );
  }

  onHourClick(date: Date, hour: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    this.openCreateModal(date, `${pad(hour)}:00`);
  }

  selectDentist(id: string | null) {
    this.selectedDentistId.set(id);
  }

  private addMinutes(isoString: string, minutes: number): string {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString().slice(0, 19);
  }
}
