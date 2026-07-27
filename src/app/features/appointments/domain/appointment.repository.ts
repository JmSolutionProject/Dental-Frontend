import { Observable } from 'rxjs';

import {
  Appointment,
  AvailabilityResult,
  CalendarSlot,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from './appointment';

export abstract class AppointmentRepository {
  abstract findAll(): Observable<Appointment[]>;
  abstract findById(id: string): Observable<Appointment>;
  abstract create(appointment: CreateAppointmentRequest): Observable<Appointment>;
  abstract update(
    id: string,
    data: UpdateAppointmentRequest,
  ): Observable<Appointment>;
  abstract cancel(id: string, reason: string): Observable<Appointment>;
  abstract delete(id: string): Observable<void>;
  abstract getAvailability(
    dentistId: string,
    slot: CalendarSlot,
  ): Observable<AvailabilityResult>;
}
