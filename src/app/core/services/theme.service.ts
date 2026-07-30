import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const THEME_KEY = 'dental_theme';
const DARK_CLASS = 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isDark = signal(false);

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'dark') {
        this.isDark.set(true);
      } else if (!stored) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDark.set(prefersDark);
      }
    }

    effect(() => {
      if (!this.isBrowser) return;
      const dark = this.isDark();
      document.documentElement.classList.toggle(DARK_CLASS, dark);
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.isDark.update((v) => !v);
  }
}
