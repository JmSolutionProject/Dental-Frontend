import { inject, Injectable } from '@angular/core';

import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class CancelAppointmentUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(id: string, reason: string) {
    return this.repository.cancel(id, reason);
  }
}
