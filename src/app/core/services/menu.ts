import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth';

export interface MenuItem {
  label: string;
  route: string;
  iconName: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly auth = inject(AuthService);

  private readonly allItems: MenuItem[] = [
    {
      label: 'Panel Principal',
      route: '/dashboard',
      iconName: 'heroHome',
      roles: ['ADMIN', 'receptionist', 'dentist'],
    },
    {
      label: 'Pacientes',
      route: '/patients',
      iconName: 'heroUsers',
      roles: ['ADMIN', 'receptionist', 'dentist'],
    },
    {
      label: 'Citas Médicas',
      route: '/appointments',
      iconName: 'heroCalendarDays',
      roles: ['ADMIN', 'receptionist', 'dentist'],
    },
    {
      label: 'Agenda',
      route: '/agenda',
      iconName: 'heroClipboardDocumentList',
      roles: ['ADMIN', 'receptionist', 'dentist'],
    },
    {
      label: 'Pagos y Caja',
      route: '/payments',
      iconName: 'heroCreditCard',
      roles: ['ADMIN', 'receptionist'],
    },
    {
      label: 'Mensajes',
      route: '/messages',
      iconName: 'heroChatBubbleBottomCenterText',
      roles: ['ADMIN', 'receptionist'],
    },
    {
      label: 'Reportes',
      route: '/reports',
      iconName: 'heroChartBarSquare',
      roles: ['ADMIN'],
    },
    {
      label: 'Catálogo Servicios',
      route: '/catalog',
      iconName: 'heroQueueList',
      roles: ['ADMIN'],
    },
    {
      label: 'Roles',
      route: '/roles',
      iconName: 'heroShieldCheck',
      roles: ['ADMIN'],
    },
    {
      label: 'Usuarios',
      route: '/users',
      iconName: 'heroUserGroup',
      roles: ['ADMIN'],
    },
  ];

  get items(): MenuItem[] {
    const userRoles = this.auth.roles().map((r) => r.toLowerCase());
    return this.allItems.filter((item) =>
      item.roles.some((r) => userRoles.includes(r.toLowerCase())),
    );
  }
}
