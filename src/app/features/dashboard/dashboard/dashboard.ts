import { AsyncPipe, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroCalendarDays,
  heroClipboardDocumentList,
  heroMagnifyingGlass,
  heroPlus,
  heroUsers,
  heroCreditCard,
  heroChartBarSquare,
  heroUserGroup,
  heroChatBubbleBottomCenterText,
  heroShieldCheck,
  heroBookOpen,
  heroHeart,
  heroClock,
  heroCurrencyDollar,
  heroArrowDownTray,
} from '@ng-icons/heroicons/outline';

import { AuthService } from '../../../core/services/auth';
import { GetAppointmentsUseCase } from '../../appointments/application/get-appointments.usecase';
import { GetPatientsUseCase } from '../../patients/application/get-patients.usecase';
import { UserRepository } from '../../users/infrastructure/user-api.repository';
import { GetDashboardKpisUseCase } from '../application/get-dashboard-kpis.usecase';
import { AppointmentStatus } from '../../appointments/domain/appointment';

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, CurrencyPipe, DatePipe, RouterLink, NgIcon],
  providers: [
    provideIcons({
      heroCalendarDays,
      heroClipboardDocumentList,
      heroMagnifyingGlass,
      heroPlus,
      heroUsers,
      heroCreditCard,
      heroChartBarSquare,
      heroUserGroup,
      heroChatBubbleBottomCenterText,
      heroShieldCheck,
      heroBookOpen,
      heroHeart,
      heroClock,
      heroCurrencyDollar,
      heroArrowDownTray,
    }),
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly getDashboardKpis = inject(GetDashboardKpisUseCase);
  private readonly userRepository = inject(UserRepository);

  protected readonly rawRole = this.auth.role;
  protected readonly currentRole = computed(() => (this.rawRole() || '').toLowerCase());
  protected readonly currentRoles = computed(() => {
    const roles = [this.currentRole(), ...this.auth.roles()]
      .map((role) => role.toLowerCase())
      .filter(Boolean);

    return new Set(roles);
  });
  
  protected readonly isAdmin = computed(() => this.hasAnyRole('admin', 'administrador'));
  protected readonly isReceptionist = computed(() => this.hasAnyRole('receptionist', 'recepcionista', 'secretaria'));
  protected readonly isDentist = computed(() => this.hasAnyRole('dentist', 'odontologo', 'odontólogo', 'medico', 'médico'));

  protected readonly userName = this.auth.user()?.name ?? 'Administrador';

  protected readonly defaultKpis = {
    revenue: { today: 0, month: 0, outstanding: 0 },
    clinical: { appointmentsToday: 0, newPatientsThisMonth: 0, activeTreatments: 0, myAppointmentsToday: 0 },
    totals: { patients: 0, appointments: 0 },
    topServices: [] as { name: string; count: number }[],
    revenueByMethod: [] as { method: string; total: number }[],
    myCommissions: 0,
  };

  protected readonly patientsTotal$ = isPlatformBrowser(this.platformId)
    ? this.getPatients.execute({ limit: 1 }).pipe(map((res) => res.total), catchError(() => of(0)))
    : of(0);

  protected readonly workersTotal$ = isPlatformBrowser(this.platformId)
    ? this.userRepository.findAll().pipe(map((users) => users.length), catchError(() => of(0)))
    : of(0);

  protected readonly appointments$ = isPlatformBrowser(this.platformId)
    ? this.getAppointments.execute().pipe(catchError(() => of([])))
    : of([]);

  protected readonly kpis$ = isPlatformBrowser(this.platformId)
    ? this.getDashboardKpis.execute().pipe(catchError(() => of(this.defaultKpis)))
    : of(this.defaultKpis);

  protected statusLabel(status: AppointmentStatus): string {
    switch (status) {
      case 'completed': return 'Atendida';
      case 'cancelled': return 'Cancelada';
      case 'scheduled': default: return 'Programada';
    }
  }

  protected statusClass(status: AppointmentStatus): string {
    switch (status) {
      case 'completed': return 'badge--success';
      case 'cancelled': return 'badge--danger';
      case 'scheduled': default: return 'badge--info';
    }
  }

  protected calculatePercent(amount: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((amount / total) * 100));
  }

  protected downloadPdfReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  private hasAnyRole(...roles: string[]): boolean {
    const currentRoles = this.currentRoles();
    return roles.some((role) => currentRoles.has(role.toLowerCase()));
  }
}

