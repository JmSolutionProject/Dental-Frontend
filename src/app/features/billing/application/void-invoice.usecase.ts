import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class VoidInvoiceUseCase {
  private readonly repository = inject(BillingRepository);

  execute(invoiceId: string) {
    return this.repository.voidInvoice(invoiceId);
  }
}
