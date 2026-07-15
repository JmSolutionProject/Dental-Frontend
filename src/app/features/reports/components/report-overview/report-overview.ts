import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, combineLatest, map, of } from 'rxjs';

import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';

@Component({
  selector: 'app-report-overview',
  imports: [AsyncPipe],
  templateUrl: './report-overview.html',
  styleUrl: './report-overview.css',
})
export class ReportOverview {
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

  protected readonly report$ = combineLatest({
    patients: this.getPatients.execute({ page: 1, limit: 1 }).pipe(catchError(() => of({ total: 0 }))),
    appointments: this.getAppointments.execute().pipe(catchError(() => of([]))),
  }).pipe(
    map(({ patients, appointments }) => ({
      totalPatients: patients.total,
      totalAppointments: appointments.length,
      scheduledAppointments: appointments.filter((item) => item.status === 'scheduled').length,
      cancelledAppointments: appointments.filter((item) => item.status === 'cancelled').length,
    })),
  );
}
