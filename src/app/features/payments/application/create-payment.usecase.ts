import { inject, Injectable } from '@angular/core';

import { CreatePaymentRequest } from '../domain/payment';
import { PaymentRepository } from '../domain/payment.repository';

@Injectable({ providedIn: 'root' })
export class CreatePaymentUseCase {
  private readonly repository = inject(PaymentRepository);

  execute(payment: CreatePaymentRequest) {
    return this.repository.create(payment);
  }
}
