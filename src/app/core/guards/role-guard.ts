import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

export type Role = string;

/**
 * Factory that creates a route guard allowing only users whose role
 * appears in the `allowed` list.  Deny-by-default: if the user is
 * authenticated but their role is not allowed, the guard redirects to
 * `/forbidden`.
 */
export function roleGuard(allowed: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) {
      return true;
    }

    const roles = auth.roles();

    if (roles.length === 0) {
      return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
    }

    const allowedLower = allowed.map((a) => a.toLowerCase());
    if (roles.some((role) => allowedLower.includes(role.toLowerCase()))) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
}
