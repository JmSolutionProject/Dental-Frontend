import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of } from 'rxjs';

import { DashboardKpis } from '../domain/dashboard-kpi';
import { DashboardRepository } from '../domain/dashboard.repository';

@Injectable({ providedIn: 'root' })
export class DashboardApiRepository implements DashboardRepository {
  getKpis(): Observable<DashboardKpis> {
    return of({
      revenue: { today: 0, month: 0, outstanding: 0 },
      clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0 },
    });
  }
}
