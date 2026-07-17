export interface DashboardKpis {
  revenue: {
    today: number;
    month: number;
    outstanding: number;
  };
  clinical: {
    appointmentsToday: number;
    newPatientsThisMonth: number;
    activeTreatments: number;
    myAppointmentsToday: number;
  };
  totals: {
    patients: number;
    appointments: number;
  };
  topServices: Array<{ name: string; count: number }>;
  revenueByMethod: Array<{ method: string; total: number }>;
  myCommissions: number;
}
