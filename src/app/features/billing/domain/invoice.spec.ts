import { describe, it, expect } from 'vitest';
import {
  invoiceStatusLabel,
  paymentMethodLabel,
  isValidInvoiceTransition,
  calculateOutstanding,
  determineNextStatus,
  type InvoiceStatus,
  type Payment,
} from './invoice';

describe('invoiceStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(invoiceStatusLabel('quote')).toBe('Quote');
    expect(invoiceStatusLabel('invoiced')).toBe('Invoiced');
    expect(invoiceStatusLabel('partial')).toBe('Partially Paid');
    expect(invoiceStatusLabel('paid')).toBe('Paid');
    expect(invoiceStatusLabel('void')).toBe('Void');
  });
});

describe('paymentMethodLabel', () => {
  it('returns human-readable labels', () => {
    expect(paymentMethodLabel('cash')).toBe('Cash');
    expect(paymentMethodLabel('card')).toBe('Card');
    expect(paymentMethodLabel('transfer')).toBe('Transfer');
    expect(paymentMethodLabel('other')).toBe('Other');
  });
});

describe('isValidInvoiceTransition', () => {
  it('allows quote → invoiced', () => {
    expect(isValidInvoiceTransition('quote', 'invoiced')).toBe(true);
  });

  it('allows quote → void', () => {
    expect(isValidInvoiceTransition('quote', 'void')).toBe(true);
  });

  it('allows invoiced → partial', () => {
    expect(isValidInvoiceTransition('invoiced', 'partial')).toBe(true);
  });

  it('allows invoiced → paid', () => {
    expect(isValidInvoiceTransition('invoiced', 'paid')).toBe(true);
  });

  it('allows partial → paid', () => {
    expect(isValidInvoiceTransition('partial', 'paid')).toBe(true);
  });

  it('allows partial → void', () => {
    expect(isValidInvoiceTransition('partial', 'void')).toBe(true);
  });

  it('allows paid → void', () => {
    expect(isValidInvoiceTransition('paid', 'void')).toBe(true);
  });

  it('allows void → quote (reopen)', () => {
    expect(isValidInvoiceTransition('void', 'quote')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidInvoiceTransition('quote', 'paid')).toBe(false);
    expect(isValidInvoiceTransition('paid', 'quote')).toBe(false);
    expect(isValidInvoiceTransition('paid', 'invoiced')).toBe(false);
    expect(isValidInvoiceTransition('void', 'paid')).toBe(false);
  });
});

describe('calculateOutstanding', () => {
  const noPayments: Payment[] = [];

  it('returns total when no payments exist', () => {
    expect(calculateOutstanding(500, noPayments)).toBe(500);
  });

  it('subtracts single payment from total', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 200, method: 'cash', createdAt: '2025-01-01' },
    ];
    expect(calculateOutstanding(500, payments)).toBe(300);
  });

  it('subtracts multiple payments from total', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 200, method: 'cash', createdAt: '2025-01-01' },
      { id: 'p2', invoiceId: 'i1', amount: 150, method: 'card', createdAt: '2025-01-02' },
    ];
    expect(calculateOutstanding(500, payments)).toBe(150);
  });

  it('returns 0 when fully paid', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 500, method: 'cash', createdAt: '2025-01-01' },
    ];
    expect(calculateOutstanding(500, payments)).toBe(0);
  });

  it('returns 0 when overpaid (clamped, no negative)', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 600, method: 'cash', createdAt: '2025-01-01' },
    ];
    expect(calculateOutstanding(500, payments)).toBe(0);
  });
});

describe('determineNextStatus', () => {
  const noPayments: Payment[] = [];

  it('returns "paid" when outstanding reaches 0', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 500, method: 'cash', createdAt: '2025-01-01' },
    ];
    expect(determineNextStatus('invoiced', 500, payments)).toBe('paid');
  });

  it('returns "partial" when invoiced with some payment', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 200, method: 'card', createdAt: '2025-01-01' },
    ];
    expect(determineNextStatus('invoiced', 500, payments)).toBe('partial');
  });

  it('keeps "partial" when partially paid again', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 100, method: 'card', createdAt: '2025-01-01' },
    ];
    expect(determineNextStatus('partial', 500, payments)).toBe('partial');
  });

  it('returns "paid" from partial when outstanding reaches 0', () => {
    const payments: Payment[] = [
      { id: 'p1', invoiceId: 'i1', amount: 500, method: 'card', createdAt: '2025-01-01' },
    ];
    expect(determineNextStatus('partial', 500, payments)).toBe('paid');
  });

  it('keeps current status when no payments and not invoiced', () => {
    expect(determineNextStatus('quote', 500, noPayments)).toBe('quote');
    expect(determineNextStatus('void', 500, noPayments)).toBe('void');
    expect(determineNextStatus('paid', 500, noPayments)).toBe('paid');
  });
});
