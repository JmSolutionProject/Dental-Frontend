import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { clinicInterceptor } from './core/interceptors/clinic-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { AppointmentRepository } from './features/appointments/domain/appointment.repository';
import { AppointmentApiRepository } from './features/appointments/infrastructure/appointment-api.repository';
import { OdontogramRepository } from './features/odontogram/domain/odontogram.repository';
import { OdontogramApiRepository } from './features/odontogram/infrastructure/odontogram-api.repository';
import { PatientRepository } from './features/patients/domain/patient.repository';
import { PatientApiRepository } from './features/patients/infrastructure/patient-api.repository';
import { TreatmentPlanRepository } from './features/treatment-plan/domain/treatment-plan.repository';
import { TreatmentPlanApiRepository } from './features/treatment-plan/infrastructure/treatment-plan-api.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, clinicInterceptor, errorInterceptor]),
    ),
    provideClientHydration(withEventReplay()),
    { provide: PatientRepository, useExisting: PatientApiRepository },
    { provide: AppointmentRepository, useExisting: AppointmentApiRepository },
    { provide: OdontogramRepository, useExisting: OdontogramApiRepository },
    { provide: TreatmentPlanRepository, useExisting: TreatmentPlanApiRepository },
  ],
};
