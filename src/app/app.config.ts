import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { AppErrorHandler } from './core/services/error-handler';
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
import { AttachmentRepository } from './features/attachments/domain/attachment.repository';
import { AttachmentApiRepository } from './features/attachments/infrastructure/attachment-api.repository';
import { BillingRepository } from './features/billing/domain/billing.repository';
import { BillingApiRepository } from './features/billing/infrastructure/billing-api.repository';
import { DashboardRepository } from './features/dashboard/domain/dashboard.repository';
import { DashboardApiRepository } from './features/dashboard/infrastructure/dashboard-api.repository';
import { MessageRepository } from './features/messages/domain/message.repository';
import { MessageApiRepository } from './features/messages/infrastructure/message-api.repository';
import { PaymentRepository } from './features/payments/domain/payment.repository';
import { PaymentApiRepository } from './features/payments/infrastructure/payment-api.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: AppErrorHandler },
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
    { provide: BillingRepository, useExisting: BillingApiRepository },
    { provide: AttachmentRepository, useExisting: AttachmentApiRepository },
    { provide: DashboardRepository, useExisting: DashboardApiRepository },
    { provide: MessageRepository, useExisting: MessageApiRepository },
    { provide: PaymentRepository, useExisting: PaymentApiRepository },
  ],
};
