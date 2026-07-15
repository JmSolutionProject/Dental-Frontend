import { Observable } from 'rxjs';

import {
  Invoice,
  CreateInvoiceRequest,
  RecordPaymentRequest,
} from './invoice';

export abstract class BillingRepository {
  /** Create a new quote. Status defaults to 'quote' server-side. */
  abstract createQuote(data: CreateInvoiceRequest): Observable<Invoice>;

  /** Fetch a single invoice/quote by ID. */
  abstract findById(id: string): Observable<Invoice>;

  /** List all invoices for a patient. */
  abstract findByPatientId(patientId: string): Observable<Invoice[]>;

  /** Convert a quote into an active invoice (status → 'invoiced'). */
  abstract convertToInvoice(id: string): Observable<Invoice>;

  /** Record a payment against an invoice. Status auto-updates server-side. */
  abstract recordPayment(
    id: string,
    data: RecordPaymentRequest,
  ): Observable<Invoice>;

  /** Void an invoice or quote. */
  abstract voidInvoice(id: string): Observable<Invoice>;
}
