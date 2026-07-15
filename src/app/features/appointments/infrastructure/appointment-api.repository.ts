import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  Appointment,
  AvailabilityResult,
  CalendarSlot,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

interface PaginatedAppointmentsResponse {
  data: Appointment[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AppointmentApiRepository implements AppointmentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll() {
    return this.http
      .get<PaginatedAppointmentsResponse>(`${this.apiUrl}/appointments`, {
        params: { page: 1, limit: 100 },
      })
      .pipe(map((response) => response.data));
  }

  findById(id: string) {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  create(appointment: CreateAppointmentRequest) {
    return this.http
      .post<Appointment | { count: number }>(
        `${this.apiUrl}/appointments`,
        this.toBackendAppointmentDto(appointment),
      )
      .pipe(map((response) => this.requireAppointmentResponse(response)));
  }

  update(id: string, data: UpdateAppointmentRequest) {
    return this.http.put<Appointment>(
      `${this.apiUrl}/appointments/${id}`,
      this.toBackendAppointmentDto(data),
    );
  }

  cancel(id: string, reason: string) {
    void reason;
    return this.http.delete<Appointment>(`${this.apiUrl}/appointments/${id}`);
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

  private toBackendAppointmentDto(data: CreateAppointmentRequest | UpdateAppointmentRequest) {
    const start = data.scheduledAt;
    const cancelReason = 'cancelReason' in data ? data.cancelReason : undefined;
    return {
      pacienteId: data.patientId ? Number(data.patientId) : undefined,
      medicoId: data.dentistId ? Number(data.dentistId) : undefined,
      estadoCitaId: undefined,
      fechaHoraInicio: start,
      fechaHoraFin: start ? this.addMinutes(start, 30) : undefined,
      motivoPrincipal: data.reason,
      observaciones: cancelReason,
    };
  }

  private addMinutes(isoString: string, minutes: number): string {
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }

  private requireAppointmentResponse(response: Appointment | { count: number }): Appointment {
    if ('id' in response) {
      return response;
    }
    throw new Error('Backend appointment creation is not implemented yet.');
  }
}
