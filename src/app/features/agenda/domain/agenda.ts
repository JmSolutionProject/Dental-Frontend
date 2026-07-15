import { Appointment } from '../../appointments/domain/appointment';

export interface TimeBlock {
  start: string;
  end: string;
}

export interface DentistColumn {
  dentistId: string;
  dentistName: string;
  appointments: Appointment[];
}

export interface AgendaDay {
  date: string;
  dentists: DentistColumn[];
  appointments: Appointment[];
}
