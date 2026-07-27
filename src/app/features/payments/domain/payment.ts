export type PaymentStatus = 'active' | 'inactive' | 'voided';
export type PaymentMethodCode = 'cash' | 'card' | 'transfer' | 'yape' | 'plin' | 'other';

export interface Cashier {
  id: string;
  name: string;
}

export interface CashRegister {
  id: string;
  name: string;
  openedAt?: string;
  closedAt?: string;
  openingAmount?: number;
  closingAmount?: number;
}

export interface PaymentMethod {
  id: string;
  code?: PaymentMethodCode;
  name: string;
}

export interface Payment {
  id: string;
  appointmentId?: string;
  invoiceId?: string;
  patientId?: string;
  patientName?: string;
  cashierId: string;
  cashierName: string;
  cashRegisterId?: string;
  cashRegisterName?: string;
  methodId: string;
  methodName: string;
  methodCode?: PaymentMethodCode;
  amount: number;
  reference?: string;
  notes?: string;
  paidAt: string;
  status: PaymentStatus;
}

export interface PaymentSummary {
  totalAmount: number;
  totalPayments: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  digitalWalletAmount: number;
  voidedAmount: number;
}

export interface PaginatedPaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  summary?: PaymentSummary;
}

export interface FindPaymentsParams {
  page?: number;
  limit?: number;
  search?: string;
  cashierId?: string;
  cashRegisterId?: string;
  methodId?: string;
  status?: PaymentStatus;
  from?: string;
  to?: string;
}

export interface CreatePaymentRequest {
  appointmentId: string;
  cashierId: string;
  methodId: string;
  amount: number;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export function createEmptyPaymentSummary(): PaymentSummary {
  return {
    totalAmount: 0,
    totalPayments: 0,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    digitalWalletAmount: 0,
    voidedAmount: 0,
  };
}

export function calculatePaymentSummary(payments: Payment[]): PaymentSummary {
  return payments.reduce((summary, payment) => {
    summary.totalPayments += 1;

    if (payment.status === 'voided') {
      summary.voidedAmount += payment.amount;
      return summary;
    }

    summary.totalAmount += payment.amount;

    const code = (payment.methodCode || '').toLowerCase();
    const name = (payment.methodName || '').toLowerCase();

    if (code === 'cash' || name.includes('efectivo') || name.includes('cash')) {
      summary.cashAmount += payment.amount;
    } else if (code === 'card' || name.includes('tarjeta') || name.includes('card') || name.includes('pos') || name.includes('visa') || name.includes('mastercard')) {
      summary.cardAmount += payment.amount;
    } else if (code === 'transfer' || name.includes('transfer') || name.includes('banco') || name.includes('deposito')) {
      summary.transferAmount += payment.amount;
    } else if (code === 'yape' || code === 'plin' || name.includes('yape') || name.includes('plin') || name.includes('billetera') || name.includes('qr')) {
      summary.digitalWalletAmount += payment.amount;
    } else {
      summary.cashAmount += payment.amount;
    }

    return summary;
  }, createEmptyPaymentSummary());
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    voided: 'Anulado',
  };

  return labels[status];
}
