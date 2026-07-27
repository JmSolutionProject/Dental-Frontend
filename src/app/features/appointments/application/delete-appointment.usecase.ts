import { Injectable, inject } from '@angular/core';
import { AppointmentRepository } from '../domain/appointment.repository';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeleteAppointmentUseCase {
  private readonly repository = inject(AppointmentRepository);

  execute(id: string): Observable<void> {
    return this.repository.delete(id);
  }
}
