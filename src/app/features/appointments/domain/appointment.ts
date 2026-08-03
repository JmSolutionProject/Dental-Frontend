export interface AppointmentService {
  id: string;
  cantidad: number;
  descuento: number;
  servicio: { id: string; nombreServicio: string; precio: number };
}

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
  planServicioId?: string;
  servicios?: AppointmentService[];
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type CreateAppointmentRequest = Omit<
  Appointment,
  'id' | 'status' | 'cancelReason'
> & {
  status?: AppointmentStatus;
  observations?: string;
  serviceId?: string;
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
  conflicts: Appointment[];
}

export interface Dentist {
  id: string;
  name: string;
}
