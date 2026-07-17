import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth';

export interface MenuItem {
  label: string;
  route: string;
  iconPath: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly auth = inject(AuthService);

  private readonly allItems: MenuItem[] = [
    {
      label: 'Panel Principal',
      route: '/dashboard',
      iconPath: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
      roles: ['admin', 'receptionist', 'dentist'],
    },
    {
      label: 'Pacientes',
      route: '/patients',
      iconPath:
        'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.31 0-6 1.57-6 3.5V20h12v-2.5c0-1.93-2.69-3.5-6-3.5Z',
      roles: ['admin', 'receptionist', 'dentist'],
    },
    {
      label: 'Citas Médicas',
      route: '/appointments',
      iconPath:
        'M7 2h2v3H7V2Zm8 0h2v3h-2V2ZM4 5h16a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 6v9h16v-9H4Zm2 2h4v4H6v-4Z',
      roles: ['admin', 'receptionist', 'dentist'],
    },
    {
      label: 'Agenda',
      route: '/agenda',
      iconPath:
        'M5 4h14a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h14V6H5Zm2 2h10v2H7V8Zm0 4h7v2H7v-2Z',
      roles: ['admin', 'receptionist', 'dentist'],
    },
    {
      label: 'Odontograma',
      route: '/patients',
      iconPath:
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-6h2v2h-2v-2Zm0-8h2v6h-2V6Z',
      roles: ['dentist'],
    },
    {
      label: 'Pagos y Caja',
      route: '/payments',
      iconPath:
        'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v8h16V8H4Zm2 2h5v2H6v-2Zm10 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
      roles: ['admin', 'receptionist'],
    },
    {
      label: 'Mensajes',
      route: '/messages',
      iconPath:
        'M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 3v-4.5A2 2 0 0 1 2 16V6a2 2 0 0 1 2-2Zm0 2v10h1v2.5L7.45 17H20V6H4Zm3 3h10v2H7V9Zm0 4h7v2H7v-2Z',
      roles: ['admin', 'receptionist'],
    },
    {
      label: 'Reportes',
      route: '/reports',
      iconPath:
        'M4 20V4h2v14h14v2H4Zm4-4V9h3v7H8Zm5 0V5h3v11h-3Zm5 0v-5h3v5h-3Z',
      roles: ['admin'],
    },
    {
      label: 'Catálogo Servicios',
      route: '/catalog',
      iconPath:
        'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H5V5h14v14Zm-5-7h-4V8h4v4Z',
      roles: ['admin'],
    },
    {
      label: 'Usuarios',
      route: '/users',
      iconPath:
        'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 18a8 8 0 0 1 16 0H4Z',
      roles: ['admin'],
    },
  ];

  get items(): MenuItem[] {
    const userRoles = this.auth.roles();
    return this.allItems.filter((item) =>
      item.roles.some((r) => userRoles.includes(r)),
    );
  }
}
