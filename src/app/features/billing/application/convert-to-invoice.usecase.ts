import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class ConvertToInvoiceUseCase {
  private readonly repository = inject(BillingRepository);

  execute(quoteId: string) {
    return this.repository.convertToInvoice(quoteId);
  }
}
