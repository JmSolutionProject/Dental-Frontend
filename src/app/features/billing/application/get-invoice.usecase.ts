import { inject, Injectable } from '@angular/core';

import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class GetInvoiceUseCase {
  private readonly repository = inject(BillingRepository);

  execute(id: string) {
    return this.repository.findById(id);
  }
}
