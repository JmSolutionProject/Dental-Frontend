import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  Invoice,
  CreateInvoiceRequest,
  RecordPaymentRequest,
} from '../domain/invoice';
import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class BillingApiRepository implements BillingRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private base = () => `${this.apiUrl}/invoices`;

  // ---- Quote / Invoice CRUD ------------------------------------------------

  createQuote(data: CreateInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.base(), data);
  }

  findById(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.base()}/${id}`);
  }

  findByPatientId(patientId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.base(), {
      params: { patientId },
    });
  }

  // ---- Lifecycle transitions ------------------------------------------------

  convertToInvoice(id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base()}/${id}/convert`, {});
  }

  recordPayment(
    id: string,
    data: RecordPaymentRequest,
  ): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base()}/${id}/payments`, data);
  }

  voidInvoice(id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base()}/${id}/void`, {});
  }
}
