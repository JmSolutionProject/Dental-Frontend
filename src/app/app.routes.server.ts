import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
