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
        canActivate: [roleGuard(['admin', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then(
            (m) => m.Dashboard,
          ),
      },
      {
        path: 'patients',
        canActivate: [roleGuard(['admin', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/patients/components/patient-list/patient-list').then(
            (m) => m.PatientList,
          ),
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard(['admin', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/patients/components/patient-detail/patient-detail').then(
            (m) => m.PatientDetail,
          ),
      },
      {
        path: 'appointments',
        canActivate: [roleGuard(['admin', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import(
            './features/appointments/components/appointment-list/appointment-list'
          ).then((m) => m.AppointmentList),
      },
      {
        path: 'agenda',
        canActivate: [roleGuard(['admin', 'dentist', 'receptionist'])],
        loadComponent: () =>
          import('./features/agenda/components/agenda-view/agenda-view').then(
            (m) => m.AgendaView,
          ),
      },
      {
        path: 'messages',
        canActivate: [roleGuard(['admin', 'dentist'])],
        loadComponent: () =>
          import(
            './features/messages/components/message-list/message-list'
          ).then((m) => m.MessageList),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
