import { inject, Injectable } from '@angular/core';

import { CalendarSlot } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class CheckAvailabilityUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(dentistId: string, slot: CalendarSlot) {
    return this.repository.getAvailability(dentistId, slot);
  }
}
