import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowRightStartOnRectangle } from '@ng-icons/heroicons/outline';

import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  imports: [NgIcon],
  providers: [provideIcons({ heroArrowRightStartOnRectangle })],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
