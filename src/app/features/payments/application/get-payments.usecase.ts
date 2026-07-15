import { inject, Injectable } from '@angular/core';

import { FindPaymentsParams } from '../domain/payment';
import { PaymentRepository } from '../domain/payment.repository';

@Injectable({ providedIn: 'root' })
export class GetPaymentsUseCase {
  private readonly repository = inject(PaymentRepository);

  execute(params?: FindPaymentsParams) {
    return this.repository.findAll(params);
  }
}
