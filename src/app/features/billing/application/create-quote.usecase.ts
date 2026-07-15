import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';
import { CreateInvoiceRequest } from '../domain/invoice';

@Injectable({ providedIn: 'root' })
export class CreateQuoteUseCase {
  private readonly repository = inject(BillingRepository);

  execute(data: CreateInvoiceRequest) {
    return this.repository.createQuote(data);
  }
}
