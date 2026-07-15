import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { FindPaymentsParams, PaginatedPaymentsResponse, Payment } from '../domain/payment';
import { PaymentRepository } from '../domain/payment.repository';

@Injectable({ providedIn: 'root' })
export class PaymentApiRepository implements PaymentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindPaymentsParams): Observable<PaginatedPaymentsResponse> {
    const httpParams = new HttpParams()
      .set('page', String(params?.page ?? 1))
      .set('limit', String(params?.limit ?? 10));

    return this.http.get<PaginatedPaymentsResponse>(`${this.apiUrl}/payments`, {
      params: httpParams,
    });
  }

  findById(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/payments/${id}`);
  }
}
