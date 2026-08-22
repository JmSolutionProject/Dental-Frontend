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
import { catchError, combineLatest, EMPTY, expand, map, of, reduce } from 'rxjs';
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
  private readonly clinicTimeZone = 'America/Lima';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly getPayments = inject(GetPaymentsUseCase);

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
  protected readonly startDate = signal<string>(this.getClinicDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  protected readonly endDate = signal<string>(this.getClinicDateInput(new Date()));

  protected readonly payments$ = isPlatformBrowser(this.platformId)
    ? this.getPayments.execute({ page: 1, limit: 100 }).pipe(
        expand((res) =>
          res.page * res.limit < res.total
            ? this.getPayments.execute({ page: res.page + 1, limit: 100 })
            : EMPTY,
        ),
        reduce((payments, res) => [...payments, ...res.data], [] as Payment[]),
        catchError(() => of([] as Payment[]))
      )
    : of([] as Payment[]);

  private getClinicWallDate(value: string | Date): Date {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.clinicTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(
      Number(values['year']),
      Number(values['month']) - 1,
      Number(values['day']),
      Number(values['hour']),
      Number(values['minute']),
      Number(values['second']),
    ));
  }

  private getClinicDateInput(value: string | Date): string {
    const date = this.getClinicWallDate(value);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private clinicDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
    return new Date(Date.UTC(year, month, day, hour, minute, second, ms));
  }

  private getPeriodRange(period: FilterPeriod, now: Date): { start: Date; end: Date } {
    const start = new Date(now);
    const end = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    if (period === 'today') return { start, end };
    if (period === 'week') {
      const daysSinceMonday = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1;
      start.setUTCDate(now.getUTCDate() - daysSinceMonday);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'month') {
      return {
        start: this.clinicDate(now.getUTCFullYear(), now.getUTCMonth(), 1),
        end: this.clinicDate(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    if (period === 'custom') {
      const [startYear, startMonth, startDay] = this.startDate().split('-').map(Number);
      const [endYear, endMonth, endDay] = this.endDate().split('-').map(Number);
      const customStart = this.clinicDate(startYear, startMonth - 1, startDay);
      const customEnd = this.clinicDate(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      return { start: customStart, end: customEnd };
    }
    if (period === 'history') {
      return {
        start: this.clinicDate(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
        end: this.clinicDate(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    return { start: new Date(0), end: new Date(8640000000000000) };
  }

  private isInRange(date: string | undefined, range: { start: Date; end: Date }): boolean {
    if (!date) return false;
    const value = new Date(date);
    return value >= range.start && value <= range.end;
  }

  private getPreviousPeriodRange(period: FilterPeriod, range: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = range.end.getTime() - range.start.getTime() + 1;
    return { start: new Date(range.start.getTime() - duration), end: new Date(range.start.getTime() - 1) };
  }

  private buildRevenueSeries(payments: Payment[], period: FilterPeriod, range: { start: Date; end: Date }): { label: string; amount: number }[] {
    const sum = (start: Date, end: Date) => payments
      .filter((payment) => this.isInRange(payment.paidAt, { start, end }))
      .reduce((total, payment) => total + payment.amount, 0);

    if (period === 'today') {
      return Array.from({ length: 24 }, (_, hour) => {
        const start = new Date(range.start); start.setUTCHours(hour);
        const end = new Date(start); end.setUTCHours(hour, 59, 59, 999);
        return { label: `${String(hour).padStart(2, '0')}:00`, amount: sum(start, end) };
      });
    }

    if (period === 'week' || period === 'custom') {
      const result: { label: string; amount: number }[] = [];
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const start = new Date(cursor); start.setUTCHours(0, 0, 0, 0);
        const end = new Date(cursor); end.setUTCHours(23, 59, 59, 999);
        result.push({ label: period === 'week' ? start.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', timeZone: 'UTC' }) : String(start.getUTCDate()).padStart(2, '0'), amount: sum(start, end) });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return result;
    }

    const result: { label: string; amount: number }[] = [];
    const cursor = this.clinicDate(range.end.getUTCFullYear(), range.end.getUTCMonth() - 5, 1);
    for (let i = 0; i < 6; i++) {
      const start = this.clinicDate(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1);
      const end = this.clinicDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59, 999);
      result.push({ label: start.toLocaleString('es-PE', { month: 'short', timeZone: 'UTC' }).toUpperCase(), amount: sum(start, end) });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return result;
  }

  private getPeriodLabel(period: FilterPeriod): string {
    return { today: 'Hoy', week: 'Esta semana', month: 'Este mes', history: 'Histórico mensual', custom: 'Periodo personalizado' }[period];
  }

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
      const now = this.getClinicWallDate(new Date());
      const period = this.selectedPeriod();
      const range = this.getPeriodRange(period, now);
      const filteredPayments = payments.filter((p) => {
        if (!p.paidAt || p.status === 'voided' || p.status === 'inactive') return false;
        return this.isInRange(p.paidAt, range);
      });

      const filteredAppointments = appointments.filter((appointment) =>
        this.isInRange(appointment.scheduledAt, range)
      );
      const previousRange = this.getPreviousPeriodRange(period, range);
      const currentPeriodPayments = filteredPayments;
      const previousPeriodPayments = payments.filter((p) => {
        if (!p.paidAt || p.status === 'voided' || p.status === 'inactive') return false;
        return this.isInRange(p.paidAt, previousRange);
      });
      const currentRevenue = currentPeriodPayments.reduce((acc, p) => acc + p.amount, 0);
      const previousRevenue = previousPeriodPayments.reduce((acc, p) => acc + p.amount, 0);

      const filteredRevenue = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

      const revenueDiff = currentRevenue - previousRevenue;
      let revenuePercent = 0;
      if (previousRevenue > 0) {
        revenuePercent = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
      } else if (currentRevenue > 0) {
        revenuePercent = 100;
      }

      const isGrowth = revenueDiff >= 0;

      const completed = filteredAppointments.filter((item) => item.status === 'completed').length;
      const scheduled = filteredAppointments.filter((item) => item.status === 'scheduled').length;
      const cancelled = filteredAppointments.filter((item) => item.status === 'cancelled').length;
      
      // Calculate payment summary for the filtered payments
      const paymentSummary = calculatePaymentSummary(filteredPayments);

      const periodHistorical = this.buildRevenueSeries(payments.filter((p) => p.status !== 'voided' && p.status !== 'inactive'), period, range);
      const serviceCounts = new Map<string, number>();
      filteredAppointments.forEach((appointment) => {
        if (appointment.servicios?.length) {
          appointment.servicios.forEach((item) => {
            const name = item.servicio?.nombreServicio || 'Servicio sin nombre';
            serviceCounts.set(name, (serviceCounts.get(name) || 0) + (item.cantidad || 1));
          });
        } else {
          const name = this.getServicesName(appointment);
          serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
        }
      });
      const topServices = [...serviceCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalPatients: patients.total,
         totalAppointments: filteredAppointments.length,
        completedAppointments: completed,
        scheduledAppointments: scheduled,
        cancelledAppointments: cancelled,
        paymentSummary,
        payments: filteredPayments,
        rawPayments: payments,
         appointmentsList: filteredAppointments,
         topServices,
         periodLabel: this.getPeriodLabel(period),
         periodHistorical,
         comparisonLabels: [period === 'today' ? 'Ayer' : 'Periodo anterior', this.getPeriodLabel(period)],
         attendanceRate: filteredAppointments.length > 0 ? Math.round((completed / filteredAppointments.length) * 100) : 0,
         cancellationRate: filteredAppointments.length > 0 ? Math.round((cancelled / filteredAppointments.length) * 100) : 0,
        periodRevenue: filteredRevenue,
        currentRevenue,
        previousRevenue,
        revenueDiff,
        revenuePercent,
        isGrowth,
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

        const labels = data.periodHistorical.map((m) => m.label);
        const values = data.periodHistorical.map((m) => m.amount);

        this.revenueChart = new Chart(this.revenueChartCanvas.nativeElement, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                 label: `Ingresos - ${data.periodLabel} (S/)`,
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
                labels: data.comparisonLabels,
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
