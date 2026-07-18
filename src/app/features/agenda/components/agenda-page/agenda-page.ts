import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { catchError, of, take, finalize } from 'rxjs';

import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { CancelAppointmentUseCase } from '../../../appointments/application/cancel-appointment.usecase';
import { Appointment } from '../../../appointments/domain/appointment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

const BLOCK_MIN_HEIGHT = 34;
const PIXELS_PER_HOUR = 96;
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

type ViewMode = 'day' | 'week' | 'month';

interface DayColumn {
  label: string;
  sublabel: string;
  date: Date;
  dateKey: string;
  isToday: boolean;
  appointments: Appointment[];
}

interface CalendarDay {
  date: Date;
  key: string;
  day: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasAppointments: boolean;
}

@Component({
  selector: 'app-agenda-page',
  imports: [DatePipe, NgIcon],
  providers: [provideIcons({ heroPlus })],
  templateUrl: './agenda-page.html',
  styleUrl: './agenda-page.css',
  host: {
    '[style.--day-cols]': 'displayDays()',
  },
})
export class AgendaPage {
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly cancelAppointment = inject(CancelAppointmentUseCase);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly weekOffset = signal(0);
  readonly viewMode = signal<ViewMode>('week');
  readonly calendarMonthOffset = signal(0);
  readonly appointments = signal<Appointment[]>([]);
  readonly selectedAppointment = signal<Appointment | null>(null);
  readonly detailVisible = signal(false);
  readonly cancelVisible = signal(false);
  readonly cancelReason = signal('');
  readonly canceling = signal(false);

  readonly hours = Array.from({ length: TOTAL_HOURS }, (_, i) =>
    `${String(START_HOUR + i).padStart(2, '0')}:00`,
  );

  readonly weekDaysShort = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  readonly weekDaysFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  readonly monthDaysShort = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  /* ---------- Week / day calculations ---------- */

  readonly displayDays = computed<number>(() =>
    this.viewMode() === 'day' ? 1 : 5,
  );

  readonly currentWeekStart = computed<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    monday.setDate(monday.getDate() + this.weekOffset() * 7);
    return monday;
  });

  readonly weekDates = computed<{ date: Date; key: string }[]>(() => {
    const start = this.currentWeekStart();
    const count = this.displayDays();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, key: this.dateKey(d) };
    });
  });

  readonly monthLabel = computed<string>(() => {
    const dates = this.weekDates();
    const first = dates[0].date;
    const last = dates[dates.length - 1].date;
    if (first.getFullYear() === last.getFullYear()) {
      if (first.getMonth() === last.getMonth()) {
        return `${this.months[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${this.months[first.getMonth()]} – ${this.months[last.getMonth()]} ${first.getFullYear()}`;
    }
    return `${this.months[first.getMonth()]} ${first.getFullYear()} – ${this.months[last.getMonth()]} ${last.getFullYear()}`;
  });

  readonly dayColumns = computed<DayColumn[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.weekDates().map((wd) => {
      const isToday = wd.date.getTime() === today.getTime();
      const apps = this.appointments()
        .filter((a) => a.scheduledAt.startsWith(wd.key))
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      const dayIndex = wd.date.getDay();
      const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      return {
        label: this.weekDaysShort[mappedIndex],
        sublabel: String(wd.date.getDate()),
        date: wd.date,
        dateKey: wd.key,
        isToday,
        appointments: apps,
      };
    });
  });

  /* ---------- Mini calendar ---------- */

  readonly miniCalDate = computed<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + this.calendarMonthOffset());
    return d;
  });

  readonly miniCalDays = computed<CalendarDay[]>(() => {
    const ref = this.miniCalDate();
    const year = ref.getFullYear();
    const month = ref.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i);
      days.push({
        date: d,
        key: this.dateKey(d),
        day: prevLast - i,
        isToday: false,
        isCurrentMonth: false,
        hasAppointments: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = this.dateKey(date);
      days.push({
        date,
        key,
        day: d,
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth: true,
        hasAppointments: this.appointmentKeys().has(key),
      });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
          date,
          key: this.dateKey(date),
          day: i,
          isToday: false,
          isCurrentMonth: false,
          hasAppointments: false,
        });
      }
    }

    return days;
  });

  readonly miniCalLabel = computed<string>(() => {
    const d = this.miniCalDate();
    return `${this.months[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly appointmentKeys = computed<Set<string>>(() => {
    const keys = new Set<string>();
    for (const a of this.appointments()) {
      keys.add(a.scheduledAt.slice(0, 10));
    }
    return keys;
  });

  /* ---------- Upcoming ---------- */

  readonly upcomingAppointments = computed<Appointment[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return this.appointments()
      .filter((a) => {
        const aptDate = new Date(a.scheduledAt);
        return aptDate >= today && aptDate <= end && a.status !== 'cancelled';
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  });

  readonly totalUpcoming = computed(() => this.upcomingAppointments().length);

  readonly todayLabel = computed<string>(() => {
    const d = new Date();
    return `${this.weekDaysFull[d.getDay()]}, ${d.getDate()} ${this.months[d.getMonth()]}`;
  });

  /* ---------- Lifecycle ---------- */

  constructor() {
    this.loadAppointments();
  }

  /* ---------- Appointments ---------- */

  loadAppointments(): void {
    this.loading.set(true);
    this.getAppointments
      .execute()
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((data) => this.appointments.set(data));
  }

  blockStyle(apt: Appointment): Record<string, string> {
    const time = apt.scheduledAt.slice(11, 16);
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return { display: 'none' };
    const startMinutes = (h - START_HOUR) * 60 + m;
    if (startMinutes < 0) return { display: 'none' };
    const top = (startMinutes / 60) * PIXELS_PER_HOUR;
    const height = Math.max(BLOCK_MIN_HEIGHT, (30 / 60) * PIXELS_PER_HOUR);
    return { top: `${top}px`, height: `${height}px` };
  }

  statusClass(apt: Appointment): string {
    return `status--${apt.status}`;
  }

  statusLabel(status: string): string {
    if (status === 'scheduled') return 'Pendiente';
    if (status === 'completed') return 'Atendida';
    return 'Cancelada';
  }

  statusIcon(status: string): string {
    if (status === 'completed') return '✓';
    if (status === 'cancelled') return '✕';
    return '⏱';
  }

  openDetail(apt: Appointment): void {
    this.selectedAppointment.set(apt);
    this.detailVisible.set(true);
  }

  closeDetail(): void {
    this.detailVisible.set(false);
  }

  openCancel(): void {
    this.detailVisible.set(false);
    const apt = this.selectedAppointment();
    if (apt) {
      this.cancelReason.set('');
      this.cancelVisible.set(true);
    }
  }

  closeCancel(): void {
    this.cancelVisible.set(false);
    this.cancelReason.set('');
  }

  confirmCancel(): void {
    const apt = this.selectedAppointment();
    const reason = this.cancelReason().trim();
    if (!apt || !reason) {
      this.toast.info('Escribe un motivo de cancelación.');
      return;
    }
    this.canceling.set(true);
    this.cancelAppointment
      .execute(apt.id, reason)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al cancelar la cita.');
          return of(null);
        }),
        finalize(() => this.canceling.set(false)),
      )
      .subscribe((appt) => {
        if (appt) {
          this.toast.success('Cita cancelada.');
          this.closeCancel();
          this.loadAppointments();
        }
      });
  }

  /* ---------- Navigation ---------- */

  navigateWeek(offset: number): void {
    this.weekOffset.update((v) => v + offset);
  }

  goToToday(): void {
    this.weekOffset.set(0);
    this.calendarMonthOffset.set(0);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  goToDate(key: string): void {
    const d = new Date(key + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const diffMs = monday.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    this.weekOffset.set(diffWeeks);
  }

  navigateCalendarMonth(offset: number): void {
    this.calendarMonthOffset.update((v) => v + offset);
  }

  dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
