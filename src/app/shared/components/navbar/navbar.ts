import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowRightStartOnRectangle, heroMoon, heroSun } from '@ng-icons/heroicons/outline';

import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'dental-theme';

@Component({
  selector: 'app-navbar',
  imports: [NgIcon],
  providers: [provideIcons({ heroArrowRightStartOnRectangle, heroMoon, heroSun })],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  readonly isDarkMode = signal(false);

  constructor() {
    this.applyTheme(this.getInitialTheme());
  }

  toggleTheme() {
    this.applyTheme(this.isDarkMode() ? 'light' : 'dark');
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private getInitialTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) return 'light';

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;

    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: ThemeMode) {
    this.isDarkMode.set(theme === 'dark');
    this.document.documentElement.setAttribute('data-theme', theme);
    this.document.documentElement.style.colorScheme = theme;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }
}
