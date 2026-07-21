import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take, catchError, of, finalize } from 'rxjs';
import { Appointment, AppointmentStatus } from '../../domain/appointment';
import { GetAppointmentsUseCase } from '../../application/get-appointments.usecase';
import { AppointmentFormModal } from '../appointment-form-modal/appointment-form-modal';
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
  imports: [AppointmentFormModal],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

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

  readonly filteredAppointments = computed<Appointment[]>(() => {
    const all = this.appointments();
    const status = this.statusFilter();
    const dentist = this.dentistFilter();
    const range = this.dateRange();

    return all.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
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
