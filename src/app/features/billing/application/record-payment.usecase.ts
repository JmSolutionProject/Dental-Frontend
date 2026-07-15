import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';
import { RecordPaymentRequest } from '../domain/invoice';

@Injectable({ providedIn: 'root' })
export class RecordPaymentUseCase {
  private readonly repository = inject(BillingRepository);

  execute(invoiceId: string, data: RecordPaymentRequest) {
    return this.repository.recordPayment(invoiceId, data);
  }
}
