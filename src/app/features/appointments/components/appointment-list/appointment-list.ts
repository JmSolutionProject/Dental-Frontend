import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take, catchError, of, finalize } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus, heroCalendarDays, heroHeart, heroEllipsisVertical, heroChevronDown, heroTrash, heroPencil } from '@ng-icons/heroicons/outline';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { Appointment, AppointmentStatus, UpdateAppointmentRequest } from '../../domain/appointment';
import { GetAppointmentsUseCase } from '../../application/get-appointments.usecase';
import { UpdateAppointmentUseCase } from '../../application/update-appointment.usecase';
import { AppointmentFormModal } from '../appointment-form-modal/appointment-form-modal';
import { Modal } from '../../../../shared/components/modal/modal';
import { DeleteAppointmentUseCase } from '../../application/delete-appointment.usecase';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { API_URL } from '../../../../core/config/api.config';

type StatusFilter = 'all' | AppointmentStatus;
type DateRange = 'all' | 'today' | 'tomorrow' | 'week' | 'month';

interface AppointmentGroup {
  key: string;
  label: string;
  count: number;
  appointments: Appointment[];
}

interface StatusOption {
  id: StatusFilter;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { id: 'all', label: 'Todos' },
  { id: 'scheduled', label: 'Pendiente' },
  { id: 'completed', label: 'Atendida' },
  { id: 'cancelled', label: 'Cancelada' },
];

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
];

@Component({
  selector: 'app-appointment-list',
  imports: [AppointmentFormModal, Modal, NgIcon, ReactiveFormsModule],
  providers: [provideIcons({ heroPlus, heroCalendarDays, heroHeart, heroEllipsisVertical, heroChevronDown, heroTrash, heroPencil })],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly fb = inject(FormBuilder);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly updateAppointment = inject(UpdateAppointmentUseCase);
  private readonly deleteAppointmentUseCase = inject(DeleteAppointmentUseCase);
  private readonly toast = inject(ToastService);

  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly statusFilter = signal<StatusFilter>('all');
  readonly dateRange = signal<DateRange>('all');
  readonly dentistFilter = signal<string>('all');

  readonly statusOptions: StatusOption[] = STATUS_OPTIONS;
  readonly dateRanges = DATE_RANGES;

  readonly dentistOptions = signal<{ id: string; name: string }[]>([
    { id: 'all', name: 'Todos los especialistas' },
  ]);

  readonly showCreateModal = signal(false);
  
  readonly editModalVisible = signal(false);
  readonly editingAppointment = signal<Appointment | null>(null);

  readonly deleteModalVisible = signal(false);
  readonly appointmentToDelete = signal<Appointment | null>(null);

  readonly editForm = this.fb.group({
    patientName: ['', [Validators.required]],
    patientId: ['', [Validators.required]],
    dentistId: ['', [Validators.required]],
    dentistName: ['', [Validators.required]],
    scheduledDate: ['', [Validators.required]],
    scheduledTime: ['', [Validators.required]],
    reason: [''],
    uiStatus: ['scheduled', [Validators.required]],
  });

  readonly filteredAppointments = computed<Appointment[]>(() => {
    const all = this.appointments();
    const status = this.statusFilter();
    const dentist = this.dentistFilter();
    const range = this.dateRange();

    return all.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
      if (status === 'all' && a.status === 'cancelled') return false;
      if (dentist !== 'all' && a.dentistId !== dentist) return false;
      if (!this.matchesDateRange(a.scheduledAt, range)) return false;
      return true;
    });
  });

  readonly groupedAppointments = computed<AppointmentGroup[]>(() => {
    const list = [...this.filteredAppointments()].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

    const groups = new Map<string, Appointment[]>();
    for (const appt of list) {
      const key = this.dayKey(appt.scheduledAt);
      const bucket = groups.get(key) ?? [];
      bucket.push(appt);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries()).map(([key, appointments]) => ({
      key,
      label: this.formatDayLabel(new Date(appointments[0].scheduledAt)),
      count: appointments.length,
      appointments,
    }));
  });

  readonly hasNoResults = computed(
    () => !this.loading() && this.filteredAppointments().length === 0,
  );

  constructor() {
    this.loadAppointments();
    this.loadDoctors();
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  setDateRange(range: DateRange): void {
    this.dateRange.set(range);
  }

  setDentistFilter(id: string): void {
    this.dentistFilter.set(id);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onAppointmentCreated(): void {
    this.showCreateModal.set(false);
    this.loadAppointments();
  }

  openEditModal(appt: Appointment): void {
    this.editingAppointment.set(appt);
    const d = new Date(appt.scheduledAt);
    const scheduledDate = this.dayKey(appt.scheduledAt);
    const scheduledTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    this.editForm.setValue({
      patientName: appt.patientName,
      patientId: appt.patientId,
      dentistId: appt.dentistId ?? '',
      dentistName: appt.dentistName ?? '',
      scheduledDate,
      scheduledTime,
      reason: appt.reason,
      uiStatus: appt.status,
    });
    this.editModalVisible.set(true);
  }

  closeEditModal(): void {
    this.editModalVisible.set(false);
    this.editingAppointment.set(null);
    this.editForm.reset();
  }

  submitEditForm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const appt = this.editingAppointment();
    if (!appt) return;

    const val = this.editForm.getRawValue();
    let scheduledAt = appt.scheduledAt;
    let newStatus = val.uiStatus;

    if (val.uiStatus === 'rescheduled') {
      scheduledAt = new Date(`${val.scheduledDate}T${val.scheduledTime}:00`).toISOString();
      newStatus = 'scheduled';
    }

    const updateReq: UpdateAppointmentRequest = {
      patientId: val.patientId || undefined,
      patientName: val.patientName || undefined,
      dentistId: val.dentistId || undefined,
      dentistName: val.dentistName || undefined,
      scheduledAt,
      reason: val.reason || undefined,
      status: newStatus as AppointmentStatus,
    };

    this.loading.set(true);
    this.updateAppointment
      .execute(appt.id, updateReq)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al actualizar la cita.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((res) => {
        if (res) {
          this.toast.success('Cita actualizada correctamente.');
          this.closeEditModal();
          this.loadAppointments();
        }
      });
  }

  openDeleteModal(appt: Appointment): void {
    this.appointmentToDelete.set(appt);
    this.deleteModalVisible.set(true);
  }

  closeDeleteModal(): void {
    this.appointmentToDelete.set(null);
    this.deleteModalVisible.set(false);
  }

  confirmDelete(): void {
    const appt = this.appointmentToDelete();
    if (!appt) return;

    this.loading.set(true);
    this.deleteAppointmentUseCase
      .execute(appt.id)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al eliminar la cita.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (result !== null) {
          this.toast.success('Cita eliminada definitivamente.');
          this.closeDeleteModal();
          this.loadAppointments();
        }
      });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getTimeDisplay(iso: string): { time: string; period: string } {
    const date = new Date(iso);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const time = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { time, period };
  }

  getStatusLabel(status: AppointmentStatus): string {
    const found = STATUS_OPTIONS.find((s) => s.id === status);
    return found?.label ?? status;
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.getAppointments
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.loadError.set(true);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((list) => this.appointments.set(list));
  }

  loadDoctors(): void {
    this.http.get<{ id: number; nombreCompleto: string }[]>(`${this.apiUrl}/users?role=MEDICO`)
      .pipe(take(1), catchError(() => of([])))
      .subscribe((users) => {
        this.dentistOptions.set([
          { id: 'all', name: 'Todos los especialistas' },
          ...users.map((u) => ({ id: String(u.id), name: u.nombreCompleto })),
        ]);
      });
  }

  private matchesDateRange(iso: string, range: DateRange): boolean {
    if (range === 'all') return true;

    const target = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const monthEnd = new Date(today);
    monthEnd.setMonth(today.getMonth() + 1);

    if (range === 'today') {
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      return target >= today && target <= endOfToday;
    }
    if (range === 'tomorrow') {
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      return target >= tomorrow && target <= endOfTomorrow;
    }
    if (range === 'week') return target >= today && target <= weekEnd;
    return target >= today && target <= monthEnd;
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatDayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (this.isSameDay(date, today)) return 'Hoy';
    if (this.isSameDay(date, tomorrow)) return 'Mañana';

    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }
}
