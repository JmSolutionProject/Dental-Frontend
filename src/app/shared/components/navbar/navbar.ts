import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowRightStartOnRectangle, heroSun, heroMoon } from '@ng-icons/heroicons/outline';

import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [NgIcon],
  providers: [provideIcons({ heroArrowRightStartOnRectangle, heroSun, heroMoon })],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleTheme() {
    this.theme.toggle();
  }
}
