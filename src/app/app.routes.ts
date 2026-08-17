import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/presentation/login-page/login-page').then(
        (m) => m.LoginPage,
      ),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import(
        './features/auth/presentation/forbidden-page/forbidden-page'
      ).then((m) => m.ForbiddenPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then(
            (m) => m.Dashboard,
          ),
      },
      {
        path: 'patients',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/patients/components/patient-list/patient-list').then(
            (m) => m.PatientList,
          ),
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/patients/components/patient-detail/patient-detail').then(
            (m) => m.PatientDetail,
          ),
      },
      {
        path: 'patients/:id/odontogram',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/odontogram/components/odontogram-chart/odontogram-chart'
          ).then((m) => m.OdontogramChart),
      },
      {
        path: 'patients/:id/treatment-plans',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/treatment-plan/components/plan-editor/plan-editor'
          ).then((m) => m.PlanEditor),
      },
      {
        path: 'patients/:id/treatment-plans/:planId',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/treatment-plan/components/plan-editor/plan-editor'
          ).then((m) => m.PlanEditor),
      },
      {
        path: 'appointments',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/appointments/components/appointment-list/appointment-list'
          ).then((m) => m.AppointmentList),
      },
      {
        path: 'appointments/calendar',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/appointments/components/calendar/calendar'
          ).then((m) => m.Calendar),
      },
      {
        path: 'agenda',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/appointments/components/calendar/calendar').then(
            (m) => m.Calendar,
          ),
      },
      {
        path: 'patients/:id/billing',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/billing/components/billing-list/billing-list'
          ).then((m) => m.BillingList),
      },
      {
        path: 'patients/:id/billing/new',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/billing/components/quote-form/quote-form'
          ).then((m) => m.QuoteForm),
      },
      {
        path: 'patients/:id/attachments',
        canActivate: [roleGuard(['ADMIN', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/attachments/components/attachment-list/attachment-list'
          ).then((m) => m.AttachmentList),
      },
      {
        path: 'messages',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/messages/components/message-list/message-list'
          ).then((m) => m.MessageList),
      },
      {
        path: 'payments',
        canActivate: [roleGuard(['ADMIN', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/payments/components/payment-list/payment-list'
          ).then((m) => m.PaymentList),
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import(
            './features/reports/components/report-overview/report-overview'
          ).then((m) => m.ReportOverview),
      },
      {
        path: 'catalog',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import(
            './features/catalog/components/catalog-list/catalog-list'
          ).then((m) => m.CatalogList),
      },
      {
        path: 'roles',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import(
            './features/roles/components/roles-list/roles-list'
          ).then((m) => m.RolesList),
      },
      {
        path: 'users',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import(
            './features/users/components/user-list/user-list'
          ).then((m) => m.UserList),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import(
            './features/account/components/user-settings/user-settings'
          ).then((m) => m.UserSettings),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
