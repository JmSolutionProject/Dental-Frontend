import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { Appointment } from '../../../appointments/domain/appointment';
import { AgendaDay, DentistColumn } from '../../domain/agenda';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeftCircle,
  heroArrowRightCircle,
  heroCalendarDays,
  heroClock,
  heroPlus,
  heroUserGroup,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-timeline',
  imports: [DatePipe, Modal, NgIcon],
  providers: [
    provideIcons({
      heroArrowLeftCircle,
      heroArrowRightCircle,
      heroCalendarDays,
      heroClock,
      heroPlus,
      heroUserGroup,
    }),
  ],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
})
export class Timeline {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

  readonly currentDate = signal(new Date());
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(false);
  readonly selectedAppointment = signal<Appointment | null>(null);
  readonly detailModalVisible = signal(false);

  readonly hours = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  readonly agendaDay = computed<AgendaDay>(() => {
    const dateStr = this.dateKey(this.currentDate());
    const dayAppointments = this.appointments().filter((a) => {
      if (a.status === 'cancelled') return false;
      const d = new Date(a.scheduledAt);
      return this.dateKey(d) === dateStr;
    });

    const dentistsMap = new Map<string, DentistColumn>();
    for (const apt of dayAppointments) {
      const dId = apt.dentistId ?? 'unassigned';
      if (!dentistsMap.has(dId)) {
        dentistsMap.set(dId, {
          dentistId: dId,
          dentistName: apt.dentistName ?? 'Sin asignar',
          appointments: [],
        });
      }
      dentistsMap.get(dId)!.appointments.push(apt);
    }

    return {
      date: dateStr,
      dentists: Array.from(dentistsMap.values()),
      appointments: dayAppointments,
    };
  });

  readonly weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  readonly weekDates = computed<{ date: Date; key: string; label: string; isToday: boolean }[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(this.currentDate());
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - ((dayOfWeek + 6) % 7));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const isToday = d.getTime() >= today.getTime() && d.getTime() <= end.getTime();
      return {
        date: d,
        key: this.dateKey(d),
        label: `${this.weekdays[d.getDay()]} ${d.getDate()}`,
        isToday,
      };
    });
  });

  readonly apptCountsByDay = computed(() => {
    const counts = new Map<string, number>();
    for (const wd of this.weekDates()) {
      counts.set(wd.key, 0);
    }
    for (const a of this.appointments()) {
      if (a.status === 'cancelled') continue;
      const d = new Date(a.scheduledAt);
      const key = this.dateKey(d);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  });

  readonly dateLabel = computed(() => {
    const d = this.currentDate();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${days[d.getDay()]}, ${d.getDate()} de ${this.months[d.getMonth()]} ${d.getFullYear()}`;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAppointments();
    }
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.getAppointments
      .execute()
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.appointments.set(data);
        this.loading.set(false);
      });
  }

  goToToday(): void {
    this.currentDate.set(new Date());
  }

  goToDate(key: string): void {
    this.currentDate.set(new Date(key));
  }

  navigate(days: number): void {
    this.currentDate.update((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      return next;
    });
  }

  blockStyle(apt: Appointment): Record<string, string> {
    const d = new Date(apt.scheduledAt);
    const h = d.getHours();
    const m = d.getMinutes();
    const top = (h - 8) * 64 + (m / 60) * 64;
    return {
      top: `${top}px`,
      height: '28px',
    };
  }

  statusClass(apt: Appointment): string {
    return `status--${apt.status}`;
  }

  statusLabel(status: string): string {
    if (status === 'scheduled') return 'Pendiente';
    if (status === 'completed') return 'Atendida';
    return 'Cancelada';
  }

  openDetail(apt: Appointment): void {
    this.selectedAppointment.set(apt);
    this.detailModalVisible.set(true);
  }

  closeDetail(): void {
    this.detailModalVisible.set(false);
    this.selectedAppointment.set(null);
  }

  dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
