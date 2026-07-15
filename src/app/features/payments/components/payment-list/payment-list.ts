import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, of } from 'rxjs';

import { GetPaymentsUseCase } from '../../application/get-payments.usecase';

@Component({
  selector: 'app-payment-list',
  imports: [AsyncPipe, CurrencyPipe, DatePipe],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentList {
  private readonly getPayments = inject(GetPaymentsUseCase);

  protected readonly payments$ = this.getPayments.execute({ page: 1, limit: 10 }).pipe(
    catchError(() => of({ data: [], total: 0, page: 1, limit: 10 })),
  );
}
