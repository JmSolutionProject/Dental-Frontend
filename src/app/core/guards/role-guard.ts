import { inject } from '@angular/core';
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
    const roles = auth.roles();

    if (roles.length === 0) {
      return router.createUrlTree(['/forbidden']);
    }

    if (roles.some((role) => allowed.includes(role))) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
}
