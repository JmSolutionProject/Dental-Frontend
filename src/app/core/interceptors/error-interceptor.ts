import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth';
import { ToastService } from '../../shared/components/toast/toast.service';

const SERVICE_401_ENDPOINTS = ['/whatsapp/'];

function isServiceEndpoint(url: string): boolean {
  return SERVICE_401_ENDPOINTS.some((segment) => url.includes(segment));
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          if (isServiceEndpoint(req.url)) {
            return throwError(() => error);
          }
          auth.logout();
          void router.navigate(['/login']);
        } else if (error.status === 403) {
          void router.navigate(['/forbidden']);
        } else {
          const message =
            error.status >= 500
              ? 'A server error occurred. Please try again later.'
              : 'An unexpected error occurred. Please try again.';
          toast.error(message);
        }
      } else {
        toast.error('A network error occurred.');
      }

      return throwError(() => error);
    }),
  );
};
