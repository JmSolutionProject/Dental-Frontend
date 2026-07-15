import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { CancelAppointmentUseCase } from '../../../appointments/application/cancel-appointment.usecase';
import { Appointment, Dentist } from '../../../appointments/domain/appointment';
import { AgendaDay, DentistColumn, TimeBlock } from '../../domain/agenda';

@Component({
  selector: 'app-timeline',
  imports: [DatePipe, Modal, FormField, ReactiveFormsModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
})
export class Timeline {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly cancelAppointment = inject(CancelAppointmentUseCase);
  private readonly toast = inject(ToastService);

  readonly currentDate = signal(new Date());
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(false);
  readonly selectedAppointment = signal<Appointment | null>(null);
  readonly detailModalVisible = signal(false);
  readonly cancelModalVisible = signal(false);
  readonly cancelTarget = signal<Appointment | null>(null);

  readonly cancelForm = new FormControl('', { nonNullable: true });

  readonly hours = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  readonly agendaDay = computed<AgendaDay>(() => {
    const dateStr = this.currentDate().toISOString().slice(0, 10);
    const dayAppointments = this.appointments().filter((a) =>
      a.scheduledAt.startsWith(dateStr),
    );

    const dentistsMap = new Map<string, DentistColumn>();

    for (const apt of dayAppointments) {
      const dId = apt.dentistId ?? 'unassigned';
      if (!dentistsMap.has(dId)) {
        dentistsMap.set(dId, {
          dentistId: dId,
          dentistName: apt.dentistName ?? 'Unassigned',
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

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAppointments();
    }
  }

  loadAppointments() {
    this.loading.set(true);
    this.getAppointments
      .execute()
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.appointments.set(data);
        this.loading.set(false);
      });
  }

  goToToday() {
    this.currentDate.set(new Date());
  }

  navigate(days: number) {
    this.currentDate.update((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      return next;
    });
  }

  dateLabel(): string {
    return this.currentDate().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  hourToPixels(hour: number): number {
    return (hour - 8) * 72;
  }

  blockStyle(apt: Appointment): Record<string, string> {
    const time = apt.scheduledAt.slice(11, 16);
    const [h, m] = time.split(':').map(Number);
    const top = this.hourToPixels(h) + (m / 60) * 72;
    return {
      top: `${top}px`,
      height: '34px',
    };
  }

  statusClass(apt: Appointment): string {
    return `status--${apt.status}`;
  }

  openDetail(apt: Appointment) {
    this.selectedAppointment.set(apt);
    this.detailModalVisible.set(true);
  }

  closeDetail() {
    this.detailModalVisible.set(false);
    this.selectedAppointment.set(null);
  }

  openCancel(apt: Appointment) {
    this.cancelTarget.set(apt);
    this.cancelForm.reset();
    this.cancelModalVisible.set(true);
  }

  closeCancel() {
    this.cancelModalVisible.set(false);
    this.cancelTarget.set(null);
    this.cancelForm.reset();
  }

  confirmCancel() {
    const target = this.cancelTarget();
    if (!target) return;
    const reason = this.cancelForm.value.trim();
    if (!reason) {
      this.toast.error('Please provide a cancellation reason.');
      return;
    }

    this.cancelAppointment
      .execute(target.id, reason)
      .pipe(
        catchError((err) => {
          this.toast.error('Failed to cancel appointment.');
          throw err;
        }),
      )
      .subscribe(() => {
        this.toast.success('Appointment cancelled.');
        this.closeCancel();
        this.loadAppointments();
      });
  }
}
