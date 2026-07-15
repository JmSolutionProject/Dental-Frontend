import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth';

export const clinicInterceptor: HttpInterceptorFn = (req, next) => {
  const clinicId = inject(AuthService).clinicId();

  if (!clinicId) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        'X-Clinic-Id': clinicId,
      },
    }),
  );
};
