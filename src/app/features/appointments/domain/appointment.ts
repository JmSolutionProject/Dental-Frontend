export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  dentistId?: string;
  dentistName?: string;
  scheduledAt: string;
  reason: string;
  status: AppointmentStatus;
  cancelReason?: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type CreateAppointmentRequest = Omit<
  Appointment,
  'id' | 'status' | 'cancelReason'
> & {
  status?: AppointmentStatus;
};

export type UpdateAppointmentRequest = Partial<
  Omit<Appointment, 'id'>
>;

export interface CalendarSlot {
  dentistId: string;
  start: string;
  end: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflict?: Appointment;
}

export interface Dentist {
  id: string;
  name: string;
}
