import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { catchError, of } from 'rxjs';

import { GetAppointmentsUseCase } from '../../application/get-appointments.usecase';

@Component({
  selector: 'app-appointment-list',
  imports: [AsyncPipe],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

  protected readonly appointments$ = isPlatformBrowser(this.platformId)
    ? this.getAppointments.execute().pipe(catchError(() => of([])))
    : of([]);
}
