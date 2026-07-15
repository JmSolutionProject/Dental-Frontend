import { inject, Injectable } from '@angular/core';

import { UpdateAppointmentRequest } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class UpdateAppointmentUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(id: string, data: UpdateAppointmentRequest) {
    return this.repository.update(id, data);
  }
}
