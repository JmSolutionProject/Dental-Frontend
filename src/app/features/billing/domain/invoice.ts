// ---------------------------------------------------------------------------
// Billing — domain types, status transitions, helpers
// ---------------------------------------------------------------------------

/** Invoice / quote lifecycle state. */
export type InvoiceStatus = 'quote' | 'invoiced' | 'partial' | 'paid' | 'void';

/** Valid transitions for each invoice status. */
export const INVOICE_STATUS_TRANSITIONS: Readonly<
  Record<InvoiceStatus, readonly InvoiceStatus[]>
> = {
  quote: ['invoiced', 'void'],
  invoiced: ['partial', 'paid', 'void'],
  partial: ['paid', 'void'],
  paid: ['void'],
  void: ['quote'],
};

/** Payment method options. */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/** A line item on a quote or invoice. References a treatment-plan procedure for traceability. */
export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  procedureId?: string; // links to treatment-plan procedure
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  toothNumber?: number;
}

/** An individual payment recorded against an invoice. */
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  createdAt: string;
}

/** The invoice aggregate — also serves as a quote when status === 'quote'. */
export interface Invoice {
  id: string;
  patientId: string;
  patientName?: string;
  planId?: string;
  items: InvoiceLineItem[];
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  payments: Payment[];
  outstanding: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Request / Command DTOs -------------------------------------------------

export interface CreateInvoiceRequest {
  patientId: string;
  planId?: string;
  items: Omit<InvoiceLineItem, 'id' | 'invoiceId'>[];
  notes?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export interface AuditContext {
  userId?: string;
}

// ---- Helpers ----------------------------------------------------------------

/** Human-readable label for an invoice status. */
export function invoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    quote: 'Quote',
    invoiced: 'Invoiced',
    partial: 'Partially Paid',
    paid: 'Paid',
    void: 'Void',
  };
  return labels[status];
}

/** Human-readable label for a payment method. */
export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer',
    other: 'Other',
  };
  return labels[method];
}

/** Checks whether a status transition is valid. */
export function isValidInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  return (INVOICE_STATUS_TRANSITIONS[from] as readonly InvoiceStatus[]).includes(to);
}

/**
 * Pure domain function — recalculates outstanding amount after payments.
 * outstanding = total - sum of all payment amounts (never negative).
 */
export function calculateOutstanding(total: number, payments: Payment[]): number {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, total - totalPaid);
}

/**
 * Determines the next status for an invoice based on the total amount paid.
 * Called after recording a payment to auto-update the status.
 */
export function determineNextStatus(
  currentStatus: InvoiceStatus,
  total: number,
  payments: Payment[],
): InvoiceStatus {
  const outstanding = calculateOutstanding(total, payments);

  if (outstanding <= 0) {
    return 'paid';
  }

  // Partial payments move from 'invoiced' to 'partial'
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > 0 && currentStatus === 'invoiced') {
    return 'partial';
  }

  return currentStatus;
}
