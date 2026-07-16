import { Component } from '@angular/core';
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
} from '@ng-icons/heroicons/outline';

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
    }),
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {}
