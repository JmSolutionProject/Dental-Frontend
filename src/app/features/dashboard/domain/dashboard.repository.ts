import { Observable } from 'rxjs';

import { DashboardKpis } from './dashboard-kpi';

export abstract class DashboardRepository {
  /** Fetch dashboard KPIs (revenue + clinical). */
  abstract getKpis(): Observable<DashboardKpis>;
}
