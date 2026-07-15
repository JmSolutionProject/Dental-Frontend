import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'patients/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'patients/:id/odontogram',
    renderMode: RenderMode.Server,
  },
  {
    path: 'patients/:id/treatment-plans',
    renderMode: RenderMode.Server,
  },
  {
    path: 'patients/:id/treatment-plans/:planId',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
