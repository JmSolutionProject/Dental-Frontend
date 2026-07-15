// ---------------------------------------------------------------------------
// Dashboard — KPI domain models
// ---------------------------------------------------------------------------

/** Revenue KPIs for the dashboard summary. */
export interface RevenueKpi {
  today: number;
  month: number;
  outstanding: number;
}

/** Clinical KPIs for the dashboard summary. */
export interface ClinicalKpi {
  appointmentsToday: number;
  newPatientsThisMonth: number;
  activeTreatments: number;
}

/** Combined dashboard KPIs returned from the API. */
export interface DashboardKpis {
  revenue: RevenueKpi;
  clinical: ClinicalKpi;
}
