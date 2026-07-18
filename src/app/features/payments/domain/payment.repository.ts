import { Observable } from 'rxjs';

import {
  CreatePaymentRequest,
  FindPaymentsParams,
  PaginatedPaymentsResponse,
  Payment,
  PaymentMethod,
} from './payment';

export abstract class PaymentRepository {
  abstract findAll(params?: FindPaymentsParams): Observable<PaginatedPaymentsResponse>;
  abstract findAllMethods(): Observable<PaymentMethod[]>;
  abstract findById(id: string): Observable<Payment>;
  abstract create(payment: CreatePaymentRequest): Observable<Payment>;
}
