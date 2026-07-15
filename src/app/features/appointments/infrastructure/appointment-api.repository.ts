import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { of } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  Appointment,
  AvailabilityResult,
  CalendarSlot,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class AppointmentApiRepository implements AppointmentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll() {
    return of<Appointment[]>([]);
  }

  findById(id: string) {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  create(appointment: CreateAppointmentRequest) {
    return this.http.post<Appointment>(
      `${this.apiUrl}/appointments`,
      appointment,
    );
  }

  update(id: string, data: UpdateAppointmentRequest) {
    return this.http.put<Appointment>(`${this.apiUrl}/appointments/${id}`, data);
  }

  cancel(id: string, reason: string) {
    return this.http.patch<Appointment>(`${this.apiUrl}/appointments/${id}`, {
      status: 'cancelled',
      cancelReason: reason,
    });
  }

  getAvailability(dentistId: string, slot: CalendarSlot) {
    const params = new HttpParams()
      .set('dentistId', dentistId)
      .set('start', slot.start)
      .set('end', slot.end);

    return this.http.get<AvailabilityResult>(
      `${this.apiUrl}/appointments/availability`,
      { params },
    );
  }
}
