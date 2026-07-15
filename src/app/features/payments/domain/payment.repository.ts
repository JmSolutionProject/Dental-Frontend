import { Observable } from 'rxjs';

import { FindPaymentsParams, PaginatedPaymentsResponse, Payment } from './payment';

export abstract class PaymentRepository {
  abstract findAll(params?: FindPaymentsParams): Observable<PaginatedPaymentsResponse>;
  abstract findById(id: string): Observable<Payment>;
}
