import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardKpis } from '../domain/dashboard-kpi';
import { DashboardRepository } from '../domain/dashboard.repository';

@Injectable({ providedIn: 'root' })
export class GetDashboardKpisUseCase {
  private readonly repo = inject(DashboardRepository);

  execute(): Observable<DashboardKpis> {
    return this.repo.getKpis();
  }
}
