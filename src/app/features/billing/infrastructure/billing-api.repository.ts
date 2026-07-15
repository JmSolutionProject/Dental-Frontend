import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import {
  Invoice,
  CreateInvoiceRequest,
  RecordPaymentRequest,
} from '../domain/invoice';
import { BillingRepository } from '../domain/billing.repository';

@Injectable({ providedIn: 'root' })
export class BillingApiRepository implements BillingRepository {
  // ---- Quote / Invoice CRUD ------------------------------------------------

  createQuote(data: CreateInvoiceRequest): Observable<Invoice> {
    void data;
    return throwError(() => new Error('Invoice endpoint is not available in the backend yet.'));
  }

  findById(id: string): Observable<Invoice> {
    void id;
    return throwError(() => new Error('Invoice endpoint is not available in the backend yet.'));
  }

  findByPatientId(patientId: string): Observable<Invoice[]> {
    void patientId;
    return of([]);
  }

  // ---- Lifecycle transitions ------------------------------------------------

  convertToInvoice(id: string): Observable<Invoice> {
    void id;
    return throwError(() => new Error('Invoice endpoint is not available in the backend yet.'));
  }

  recordPayment(
    id: string,
    data: RecordPaymentRequest,
  ): Observable<Invoice> {
    void id;
    void data;
    return throwError(() => new Error('Invoice endpoint is not available in the backend yet.'));
  }

  voidInvoice(id: string): Observable<Invoice> {
    void id;
    return throwError(() => new Error('Invoice endpoint is not available in the backend yet.'));
  }
}
