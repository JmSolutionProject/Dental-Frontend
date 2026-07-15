import { inject, Injectable } from '@angular/core';

import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class GetAppointmentsUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute() {
    return this.repository.findAll();
  }
}
