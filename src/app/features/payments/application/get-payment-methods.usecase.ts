import { inject, Injectable } from '@angular/core';

import { PaymentRepository } from '../domain/payment.repository';

@Injectable({ providedIn: 'root' })
export class GetPaymentMethodsUseCase {
  private readonly repository = inject(PaymentRepository);

  execute() {
    return this.repository.findAllMethods();
  }
}
