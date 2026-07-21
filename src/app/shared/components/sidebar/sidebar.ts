import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroCalendarDays,
  heroChartBarSquare,
  heroChatBubbleBottomCenterText,
  heroClipboardDocumentList,
  heroCog6Tooth,
  heroCreditCard,
  heroHome,
  heroUsers,
  heroQueueList,
  heroShieldCheck,
  heroUserGroup,
} from '@ng-icons/heroicons/outline';
import { MenuService } from '../../../core/services/menu';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({
      heroCalendarDays,
      heroChartBarSquare,
      heroChatBubbleBottomCenterText,
      heroClipboardDocumentList,
      heroCog6Tooth,
      heroCreditCard,
      heroHome,
      heroUsers,
      heroQueueList,
      heroShieldCheck,
      heroUserGroup,
    }),
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly menuService = inject(MenuService);
}
