import { inject, Injectable } from '@angular/core';

import { CreateAppointmentRequest } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class CreateAppointmentUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(request: CreateAppointmentRequest) {
    return this.repository.create(request);
  }
}
