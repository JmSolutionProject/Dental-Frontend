import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, take, catchError, of, Observable, shareReplay, switchMap } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  Appointment,
  AppointmentStatus,
  AvailabilityResult,
  CalendarSlot,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

interface PaginatedAppointmentsResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AppointmentApiRepository implements AppointmentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private defaultStatusId: number | undefined;
  private statuses: { id: number; nombre: string }[] = [];
  private readonly statuses$ = this.http
    .get<{ id: number; nombre: string }[]>(`${this.apiUrl}/appointments/statuses`)
    .pipe(
      take(1),
      catchError(() => of([])),
      map((statuses: { id: number; nombre: string }[]) => {
        this.statuses = statuses;
        this.defaultStatusId = this.findScheduledStatusId(statuses);
        return statuses;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  constructor() {
    this.statuses$.subscribe();
  }

  findAll(): Observable<Appointment[]> {
    return this.http
      .get<PaginatedAppointmentsResponse>(`${this.apiUrl}/appointments`, {
        params: { page: 1, limit: 100 },
      })
      .pipe(
        map((response) => (response.data || []).map((raw: any) => this.toDomainAppointment(raw))),
      );
  }

  findById(id: string): Observable<Appointment> {
    return this.http
      .get<any>(`${this.apiUrl}/appointments/${id}`)
      .pipe(map((raw: any) => this.toDomainAppointment(raw)));
  }

  create(appointment: CreateAppointmentRequest): Observable<Appointment> {
    return this.statuses$.pipe(
      switchMap(() => this.http.post<any>(
        `${this.apiUrl}/appointments`,
        this.toBackendAppointmentDto(appointment),
      )),
      map((response: any) => this.toDomainAppointment(response)),
    );
  }

  update(id: string, data: UpdateAppointmentRequest): Observable<Appointment> {
    return this.statuses$.pipe(
      switchMap(() => this.http.put<any>(
        `${this.apiUrl}/appointments/${id}`,
        this.toBackendAppointmentDto(data),
      )),
      map((response: any) => this.toDomainAppointment(response)),
    );
  }

  cancel(id: string, reason: string): Observable<Appointment> {
    void reason;
    return this.http
      .delete<any>(`${this.apiUrl}/appointments/${id}`)
      .pipe(map((response: any) => this.toDomainAppointment(response)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}/permanent`);
  }

  getAvailability(dentistId: string, slot: CalendarSlot): Observable<AvailabilityResult> {
    const params = new HttpParams()
      .set('dentistId', dentistId)
      .set('start', slot.start)
      .set('end', slot.end);

    return this.http.get<AvailabilityResult>(
      `${this.apiUrl}/appointments/availability`,
      { params },
    );
  }

  private toDomainAppointment(raw: any): Appointment {
    if (!raw) {
      return {
        id: '',
        patientId: '',
        patientName: 'Paciente',
        scheduledAt: new Date().toISOString(),
        reason: 'Consulta Odontológica',
        status: 'scheduled',
      };
    }

    let status: AppointmentStatus = 'scheduled';
    const statusName = (raw.estadoCita?.nombre || raw.status || raw.estado || '').toString().toLowerCase();
    const statusId = Number(raw.estadoCitaId || raw.estadoId || raw.statusId);

    if (
      statusId === 2 ||
      statusName.includes('atend') ||
      statusName.includes('complet') ||
      statusName.includes('pagad') ||
      statusName.includes('finaliz')
    ) {
      status = 'completed';
    } else if (statusId === 3 || statusName.includes('cancel')) {
      status = 'cancelled';
    } else {
      status = 'scheduled';
    }

    const patientName =
      raw.patientName ||
      (raw.paciente
        ? `${raw.paciente.nombres || raw.paciente.firstName || ''} ${raw.paciente.apellidos || raw.paciente.lastName || ''}`.trim()
        : '') ||
      'Paciente Odontológico';

    const dentistName =
      raw.dentistName ||
      (raw.medico
        ? `Dr(a). ${raw.medico.nombres || raw.medico.firstName || ''} ${raw.medico.apellidos || raw.medico.lastName || ''}`.trim()
        : '') ||
      'Odontólogo General';

    return {
      id: String(raw.id),
      patientId: String(raw.patientId || raw.pacienteId || ''),
      patientName,
      dentistId: raw.dentistId || raw.medicoId ? String(raw.dentistId || raw.medicoId) : undefined,
      dentistName,
      scheduledAt: raw.scheduledAt || raw.fechaHoraInicio || raw.fechaHora || new Date().toISOString(),
      reason: raw.reason || raw.motivoPrincipal || raw.motivo || 'Consulta Odontológica',
      status,
      cancelReason: raw.cancelReason || raw.observaciones,
      planServicioId: raw.planServicioId ? String(raw.planServicioId) : undefined,
      servicios: raw.servicios,
    };
  }

  private toBackendAppointmentDto(data: CreateAppointmentRequest | UpdateAppointmentRequest) {
    const start = data.scheduledAt;
    const cancelReason = 'cancelReason' in data ? data.cancelReason : undefined;
    const medicoId = data.dentistId ? Number(data.dentistId) : undefined;
    const observations = 'observations' in data ? data.observations : undefined;
    const serviceId =
      'serviceId' in data && data.serviceId ? Number(data.serviceId) : undefined;
    let estadoCitaId = this.defaultStatusId;
    if ('status' in data && data.status) {
      if (data.status === 'completed') {
        const found = this.statuses.find((s) => s.nombre.toLowerCase().includes('atend') || s.nombre.toLowerCase().includes('complet'));
          estadoCitaId = found ? found.id : estadoCitaId;
      } else if (data.status === 'cancelled') {
        const found = this.statuses.find((s) => s.nombre.toLowerCase().includes('cancel'));
          estadoCitaId = found ? found.id : estadoCitaId;
      } else {
        const found = this.statuses.find((s) => s.nombre.toLowerCase().includes('pendient') || s.nombre.toLowerCase().includes('program'));
          estadoCitaId = found ? found.id : estadoCitaId;
      }
    }

    if (!estadoCitaId) {
      throw new Error('No appointment statuses are available.');
    }

    return {
      pacienteId: data.patientId ? Number(data.patientId) : undefined,
      medicoId,
      estadoCitaId,
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

  private findScheduledStatusId(statuses: { id: number; nombre: string }[]): number | undefined {
    const scheduled = statuses.find((s) => {
      const name = s.nombre.toLowerCase();
      return name.includes('program') || name.includes('pendient') || name.includes('confirm');
    });

    return scheduled?.id ?? statuses[0]?.id;
  }
}
