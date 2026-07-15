import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class GetPatientInvoicesUseCase {
  private readonly repository = inject(BillingRepository);

  execute(patientId: string) {
    return this.repository.findByPatientId(patientId);
  }
}
