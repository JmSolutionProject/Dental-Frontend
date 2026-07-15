import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { GetAppointmentsUseCase } from '../../appointments/application/get-appointments.usecase';
import { GetPatientsUseCase } from '../../patients/application/get-patients.usecase';

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

  protected readonly patientsTotal$ = isPlatformBrowser(this.platformId)
    ? this.getPatients
        .execute({ limit: 1 })
        .pipe(
          map((res) => res.total),
          catchError(() => of(0)),
        )
    : of(0);

  protected readonly appointments$ = isPlatformBrowser(this.platformId)
    ? this.getAppointments.execute().pipe(catchError(() => of([])))
    : of([]);
}
