import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  CreatePaymentRequest,
  FindPaymentsParams,
  PaginatedPaymentsResponse,
  Payment,
  PaymentMethod,
} from '../domain/payment';
import { PaymentRepository } from '../domain/payment.repository';

@Injectable({ providedIn: 'root' })
export class PaymentApiRepository implements PaymentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindPaymentsParams): Observable<PaginatedPaymentsResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params?.page ?? 1))
      .set('limit', String(params?.limit ?? 10));

    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.cashierId) httpParams = httpParams.set('cashierId', params.cashierId);
    if (params?.cashRegisterId) httpParams = httpParams.set('cashRegisterId', params.cashRegisterId);
    if (params?.methodId) httpParams = httpParams.set('methodId', params.methodId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);

    return this.http.get<PaginatedPaymentsResponse>(`${this.apiUrl}/payments`, {
      params: httpParams,
    });
  }

  findById(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/payments/${id}`);
  }

  findAllMethods(): Observable<PaymentMethod[]> {
    return this.http
      .get<{ data: PaymentMethod[] }>(`${this.apiUrl}/payments/methods`)
      .pipe(map((response) => response.data));
  }

  create(payment: CreatePaymentRequest): Observable<Payment> {
    const payload: any = {
      metodoPagoId: Number(payment.methodId) || 1,
      montoPagado: payment.amount,
      numeroOperacion: payment.reference || undefined,
      observacion: payment.notes || undefined,
      fechaPago: payment.paidAt,
    };

    if (payment.appointmentId && payment.appointmentId !== '') {
      const numCita = Number(payment.appointmentId);
      payload.citaId = isNaN(numCita) ? payment.appointmentId : numCita;
    }

    if (payment.cashierId) {
      const numCashier = Number(payment.cashierId);
      payload.usuarioCobradorId = isNaN(numCashier) || numCashier <= 0 ? 1 : numCashier;
    } else {
      payload.usuarioCobradorId = 1;
    }

    return this.http.post<Payment>(`${this.apiUrl}/payments`, payload);
  }
}
