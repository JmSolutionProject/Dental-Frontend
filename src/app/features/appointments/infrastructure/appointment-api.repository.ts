import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, take, catchError, of } from 'rxjs';

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

  private defaultStatusId = 1;

  constructor() {
    this.loadStatuses();
  }

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

  private loadStatuses(): void {
    this.http.get<{ id: number; nombre: string }[]>(`${this.apiUrl}/appointments/statuses`)
      .pipe(take(1), catchError(() => of([])))
      .subscribe((statuses) => {
        if (statuses.length > 0) {
          this.defaultStatusId = statuses[0].id;
        }
      });
  }

  private toBackendAppointmentDto(data: CreateAppointmentRequest | UpdateAppointmentRequest) {
    const start = data.scheduledAt;
    const cancelReason = 'cancelReason' in data ? data.cancelReason : undefined;
    const medicoId = data.dentistId ? Number(data.dentistId) : undefined;
    const observations = 'observations' in data ? data.observations : undefined;
    const serviceId =
      'serviceId' in data && data.serviceId ? Number(data.serviceId) : undefined;
    return {
      pacienteId: data.patientId ? Number(data.patientId) : undefined,
      medicoId,
      estadoCitaId: this.defaultStatusId,
      fechaHoraInicio: start,
      fechaHoraFin: start ? this.addMinutes(start, 60) : undefined,
      motivoPrincipal: data.reason,
      observaciones: observations ?? cancelReason,
      planServicioId: data.planServicioId ? Number(data.planServicioId) : undefined,
      servicios: serviceId ? [{ servicioId: serviceId, cantidad: 1, descuento: 0 }] : undefined,
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
