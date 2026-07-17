import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { DashboardKpis } from '../domain/dashboard-kpi';
import { DashboardRepository } from '../domain/dashboard.repository';

@Injectable({ providedIn: 'root' })
export class DashboardApiRepository implements DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getKpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.apiUrl}/dashboard/kpis`);
  }
}
