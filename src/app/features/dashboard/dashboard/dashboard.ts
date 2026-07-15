import { AsyncPipe, CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { GetAppointmentsUseCase } from '../../appointments/application/get-appointments.usecase';
import { GetPatientsUseCase } from '../../patients/application/get-patients.usecase';
import { GetDashboardKpisUseCase } from '../application/get-dashboard-kpis.usecase';

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, CurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly getDashboardKpis = inject(GetDashboardKpisUseCase);

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

  protected readonly kpis$ = isPlatformBrowser(this.platformId)
    ? this.getDashboardKpis.execute().pipe(
        catchError(() =>
          of({
            revenue: { today: 0, month: 0, outstanding: 0 },
            clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0 },
          }),
        ),
      )
    : of({
        revenue: { today: 0, month: 0, outstanding: 0 },
        clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0 },
      });
}
