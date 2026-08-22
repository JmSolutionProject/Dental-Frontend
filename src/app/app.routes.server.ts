import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/odontogram',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/treatment-plans',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/treatment-plans/:planId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/billing',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/billing/new',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id/attachments',
    renderMode: RenderMode.Client,
  },
  {
    path: 'payments',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reports',
    renderMode: RenderMode.Client,
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients',
    renderMode: RenderMode.Client,
  },
  {
    path: 'appointments',
    renderMode: RenderMode.Client,
  },
  {
    path: 'appointments/calendar',
    renderMode: RenderMode.Client,
  },
  {
    path: 'agenda',
    renderMode: RenderMode.Client,
  },
  {
    path: 'messages',
    renderMode: RenderMode.Client,
  },
  {
    path: 'catalog',
    renderMode: RenderMode.Client,
  },
  {
    path: 'roles',
    renderMode: RenderMode.Client,
  },
  {
    path: 'users',
    renderMode: RenderMode.Client,
  },
  {
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
