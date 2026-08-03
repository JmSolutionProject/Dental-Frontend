import { AsyncPipe, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  effect,
} from '@angular/core';
import { catchError, combineLatest, map, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChartBarSquare,
  heroDocumentText,
  heroPrinter,
  heroCurrencyDollar,
  heroCreditCard,
  heroCalendarDays,
  heroUsers,
  heroCheckCircle,
  heroXCircle,
  heroArrowPath,
  heroFunnel,
  heroMagnifyingGlass,
  heroTableCells,
  heroHeart,
  heroArrowTrendingUp,
  heroArrowTrendingDown,
  heroSparkles,
  heroClock,
  heroShieldCheck,
  heroTag,
} from '@ng-icons/heroicons/outline';
import { Chart, registerables, type TooltipItem } from 'chart.js';

import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';
import { GetPaymentsUseCase } from '../../../payments/application/get-payments.usecase';
import { GetDashboardKpisUseCase } from '../../../dashboard/application/get-dashboard-kpis.usecase';
import { Payment, calculatePaymentSummary } from '../../../payments/domain/payment';
import { AuthService } from '../../../../core/services/auth';

Chart.register(...registerables);

export type ReportTab = 'dashboard' | 'daily' | 'clinical' | 'services';
export type FilterPeriod = 'today' | 'week' | 'month' | 'history' | 'custom';

@Component({
  selector: 'app-report-overview',
  imports: [AsyncPipe, CurrencyPipe, DatePipe, FormsModule, NgIcon],
  providers: [
    provideIcons({
      heroChartBarSquare,
      heroDocumentText,
      heroPrinter,
      heroCurrencyDollar,
      heroCreditCard,
      heroCalendarDays,
      heroUsers,
      heroCheckCircle,
      heroXCircle,
      heroArrowPath,
      heroFunnel,
      heroMagnifyingGlass,
      heroTableCells,
      heroHeart,
      heroArrowTrendingUp,
      heroArrowTrendingDown,
      heroSparkles,
      heroClock,
      heroShieldCheck,
      heroTag,
    }),
  ],
  templateUrl: './report-overview.html',
  styleUrl: './report-overview.css',
})
export class ReportOverview implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly getPayments = inject(GetPaymentsUseCase);
  private readonly getDashboardKpis = inject(GetDashboardKpisUseCase);

  @ViewChild('revenueChartCanvas') revenueChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('momChartCanvas') momChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('methodChartCanvas') methodChartCanvas?: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private momChart?: Chart;
  private methodChart?: Chart;

  protected readonly cashierName = computed(() => {
    const u = this.auth.user();
    return u?.name || u?.sub || 'Secretaría en Turno';
  });

  protected readonly activeTab = signal<ReportTab>('dashboard');
  protected readonly selectedPeriod = signal<FilterPeriod>('month');

  // Custom date range
  protected readonly startDate = signal<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  protected readonly endDate = signal<string>(new Date().toISOString().slice(0, 10));

  protected readonly payments$ = isPlatformBrowser(this.platformId)
    ? this.getPayments.execute({ limit: 300 }).pipe(
        map((res) => res.data),
        catchError(() => of([] as Payment[]))
      )
    : of([] as Payment[]);

  protected readonly kpis$ = isPlatformBrowser(this.platformId)
    ? this.getDashboardKpis.execute().pipe(
        catchError(() => of({
          revenue: { today: 0, month: 0, outstanding: 0 },
          clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0, myAppointmentsToday: 0 },
          totals: { patients: 0, appointments: 0 },
          topServices: [],
          revenueByMethod: [],
          myCommissions: 0,
        }))
      )
    : of({
        revenue: { today: 0, month: 0, outstanding: 0 },
        clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0, myAppointmentsToday: 0 },
        totals: { patients: 0, appointments: 0 },
        topServices: [],
        revenueByMethod: [],
        myCommissions: 0,
      });

  protected readonly overview$ = combineLatest({
    patients: isPlatformBrowser(this.platformId)
      ? this.getPatients.execute({ page: 1, limit: 1 }).pipe(catchError(() => of({ total: 0 })))
      : of({ total: 0 }),
    appointments: isPlatformBrowser(this.platformId)
      ? this.getAppointments.execute().pipe(catchError(() => of([])))
      : of([]),
    payments: this.payments$,
  }).pipe(
    map(({ patients, appointments, payments }) => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Filter payments based on selectedPeriod()
      const filteredPayments = payments.filter((p) => {
        if (!p.paidAt || p.status === 'voided') return false;
        const d = new Date(p.paidAt);
        const period = this.selectedPeriod();

        if (period === 'today') {
          return d.toDateString() === now.toDateString();
        }
        if (period === 'week') {
          const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
          return d >= firstDayOfWeek;
        }
        if (period === 'month') {
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }
        if (period === 'custom') {
          const start = new Date(this.startDate());
          const end = new Date(this.endDate());
          end.setHours(23, 59, 59);
          return d >= start && d <= end;
        }
        return true; // 'history'
      });

      // Filter current month & previous month payments for MoM comparison
      const currentMonthPayments = payments.filter((p) => {
        if (!p.paidAt || p.status === 'voided') return false;
        const d = new Date(p.paidAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      const previousMonthPayments = payments.filter((p) => {
        if (!p.paidAt || p.status === 'voided') return false;
        const d = new Date(p.paidAt);
        const prevDate = new Date(currentYear, currentMonth - 1, 1);
        return d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
      });

      const currentRevenue = currentMonthPayments.reduce((acc, p) => acc + p.amount, 0);
      const previousRevenue = previousMonthPayments.reduce((acc, p) => acc + p.amount, 0);

      const filteredRevenue = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

      const revenueDiff = currentRevenue - previousRevenue;
      let revenuePercent = 0;
      if (previousRevenue > 0) {
        revenuePercent = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
      } else if (currentRevenue > 0) {
        revenuePercent = 100;
      }

      const isGrowth = revenueDiff >= 0;

      const completed = appointments.filter((item) => item.status === 'completed').length;
      const scheduled = appointments.filter((item) => item.status === 'scheduled').length;
      const cancelled = appointments.filter((item) => item.status === 'cancelled').length;
      
      // Calculate payment summary for the filtered payments
      const paymentSummary = calculatePaymentSummary(filteredPayments);

      // Historical Monthly Revenue Data (Last 6 Months)
      const monthlyHistorical: { label: string; amount: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const monthName = targetDate.toLocaleString('es-PE', { month: 'short' }).toUpperCase();
        const monthPayments = payments.filter((p) => {
          if (!p.paidAt || p.status === 'voided') return false;
          const d = new Date(p.paidAt);
          return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
        });
        const monthSum = monthPayments.reduce((acc, p) => acc + p.amount, 0);
        monthlyHistorical.push({ label: monthName, amount: monthSum });
      }

      return {
        totalPatients: patients.total,
        totalAppointments: appointments.length,
        completedAppointments: completed,
        scheduledAppointments: scheduled,
        cancelledAppointments: cancelled,
        paymentSummary,
        payments: filteredPayments,
        rawPayments: payments,
        appointmentsList: appointments,
        attendanceRate: appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0,
        cancellationRate: appointments.length > 0 ? Math.round((cancelled / appointments.length) * 100) : 0,
        currentRevenue: filteredRevenue || currentRevenue || paymentSummary.totalAmount,
        previousRevenue,
        revenueDiff,
        revenuePercent,
        isGrowth,
        monthlyHistorical,
      };
    }),
  );

  protected getServicesName(appointment: any): string {
    if (appointment.reason) return appointment.reason;
    if (appointment.servicios && appointment.servicios.length > 0) {
      return appointment.servicios.map((s: any) => s.servicio?.nombreServicio || '').filter(Boolean).join(', ');
    }
    return 'Consulta Odontológica General';
  }

  protected readonly todayDate = new Date();

  constructor() {
    effect(() => {
      // Re-render charts when period, date range, or active tab changes
      this.selectedPeriod();
      this.startDate();
      this.endDate();
      if (this.activeTab() === 'dashboard') {
        setTimeout(() => this.renderCharts(), 150);
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.renderCharts(), 200);
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  protected setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    if (tab === 'dashboard') {
      setTimeout(() => this.renderCharts(), 150);
    }
  }

  protected setPeriod(period: FilterPeriod): void {
    this.selectedPeriod.set(period);
    setTimeout(() => this.renderCharts(), 150);
  }

  protected renderCharts(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.overview$.subscribe((data) => {
      // 1. Revenue Evolution Line Chart
      if (this.revenueChartCanvas?.nativeElement) {
        if (this.revenueChart) this.revenueChart.destroy();

        const labels = data.monthlyHistorical.map((m) => m.label);
        const values = data.monthlyHistorical.map((m) => m.amount);

        this.revenueChart = new Chart(this.revenueChartCanvas.nativeElement, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Ingresos Mensuales (S/)',
                data: values,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#0284c7',
                pointRadius: 5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: TooltipItem<'line'>) => ` Ingresos: S/ ${Number(ctx.raw).toFixed(2)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: {
                  callback: (val: string | number) => `S/ ${val}`,
                },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }

      // 2. MoM Comparative Bar Chart
      if (this.momChartCanvas?.nativeElement) {
        if (this.momChart) this.momChart.destroy();

        this.momChart = new Chart(this.momChartCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: ['Mes Anterior', 'Mes Actual'],
            datasets: [
              {
                label: 'Ingresos (S/)',
                data: [data.previousRevenue, data.currentRevenue],
                backgroundColor: ['#94a3b8', '#10b981'],
                borderRadius: 8,
                barThickness: 40,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: TooltipItem<'bar'>) => ` S/ ${Number(ctx.raw).toFixed(2)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { callback: (val: string | number) => `S/ ${val}` },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }

      // 3. Payment Method Doughnut Chart
      if (this.methodChartCanvas?.nativeElement) {
        if (this.methodChart) this.methodChart.destroy();

        const s = data.paymentSummary;
        this.methodChart = new Chart(this.methodChartCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: ['Efectivo en Caja', 'Tarjetas POS', 'Transferencias / Yape / Plin'],
            datasets: [
              {
                data: [s.cashAmount, s.cardAmount, s.transferAmount + s.digitalWalletAmount],
                backgroundColor: ['#10b981', '#0ea5e9', '#8b5cf6'],
                borderWidth: 2,
                borderColor: '#ffffff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: (ctx: TooltipItem<'doughnut'>) => ` ${ctx.label}: S/ ${Number(ctx.raw).toFixed(2)}`,
                },
              },
            },
            cutout: '68%',
          },
        });
      }
    });
  }

  private destroyCharts(): void {
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.momChart) this.momChart.destroy();
    if (this.methodChart) this.methodChart.destroy();
  }

  protected downloadPdfReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
