import { inject, Injectable } from '@angular/core';

import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable({ providedIn: 'root' })
export class GetAppointmentUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(id: string) {
    return this.repository.findById(id);
  }
}
