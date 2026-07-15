import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take, catchError, of, finalize, EMPTY } from 'rxjs';

import { GetPatientInvoicesUseCase } from '../../application/get-patient-invoices.usecase';
import { ConvertToInvoiceUseCase } from '../../application/convert-to-invoice.usecase';
import { VoidInvoiceUseCase } from '../../application/void-invoice.usecase';
import { AuditService } from '../../../../core/services/audit.service';
import {
  Invoice,
  invoiceStatusLabel,
  isValidInvoiceTransition,
} from '../../domain/invoice';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';
import { PaymentModal } from '../payment-modal/payment-modal';

/** Inline record-payment dialog kept in list for quick access. */
@Component({
  selector: 'app-billing-list',
  imports: [RouterLink, CurrencyPipe, DatePipe, Modal, PaymentModal],
  templateUrl: './billing-list.html',
  styleUrl: './billing-list.css',
})
export class BillingList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getInvoices = inject(GetPatientInvoicesUseCase);
  private readonly convertToInvoice = inject(ConvertToInvoiceUseCase);
  private readonly voidInvoiceUseCase = inject(VoidInvoiceUseCase);
  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);

  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly patientId = signal<string | null>(null);

  // Payment modal state
  readonly paymentModalVisible = signal(false);
  readonly selectedInvoice = signal<Invoice | null>(null);

  // Invoice detail panel
  readonly detailInvoice = signal<Invoice | null>(null);

  // Convert confirmation
  readonly convertModalVisible = signal(false);
  readonly convertingInvoiceId = signal<string | null>(null);
  readonly converting = signal(false);

  // Void confirmation
  readonly voidModalVisible = signal(false);
  readonly voidingInvoiceId = signal<string | null>(null);
  readonly voiding = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.toast.error('Patient ID not found.');
        this.router.navigate(['/patients']);
        return;
      }
      this.patientId.set(id);
      this.loadInvoices(id);
    });
  }

  private loadInvoices(patientId: string): void {
    this.loading.set(true);
    this.getInvoices
      .execute(patientId)
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((list) => this.invoices.set(list));
  }

  // ---- Status badge helpers -------------------------------------------------

  statusClass(status: string): string {
    const map: Record<string, string> = {
      quote: 'badge--info',
      invoiced: 'badge--warning',
      partial: 'badge--warning',
      paid: 'badge--success',
      void: 'badge--danger',
    };
    return map[status] ?? '';
  }

  statusLabel = invoiceStatusLabel;

  canConvert(invoice: Invoice): boolean {
    return isValidInvoiceTransition(invoice.status, 'invoiced');
  }

  canPay(invoice: Invoice): boolean {
    return (
      isValidInvoiceTransition(invoice.status, 'partial') ||
      isValidInvoiceTransition(invoice.status, 'paid')
    );
  }

  canVoid(invoice: Invoice): boolean {
    return isValidInvoiceTransition(invoice.status, 'void');
  }

  // ---- Audit helper ----------------------------------------------------------

  private auditLog(
    action: string,
    invoiceId: string,
    extra: Record<string, unknown> = {},
  ): void {
    this.audit
      .log(action, { invoiceId, ...extra })
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  // ---- Actions --------------------------------------------------------------

  viewInvoice(invoice: Invoice): void {
    this.detailInvoice.set(invoice);
  }

  closeDetail(): void {
    this.detailInvoice.set(null);
  }

  openConvertConfirm(invoice: Invoice): void {
    this.convertingInvoiceId.set(invoice.id);
    this.convertModalVisible.set(true);
  }

  cancelConvert(): void {
    this.convertModalVisible.set(false);
    this.convertingInvoiceId.set(null);
  }

  confirmConvert(): void {
    const id = this.convertingInvoiceId();
    if (!id) return;

    this.converting.set(true);
    this.convertToInvoice
      .execute(id)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => {
          this.converting.set(false);
          this.convertModalVisible.set(false);
          this.convertingInvoiceId.set(null);
        }),
      )
      .subscribe((updated) => {
        if (updated) {
          this.toast.success('Quote converted to invoice.');
          this.replaceInList(updated);
          this.auditLog('billing.convert', id);
        }
      });
  }

  openPaymentModal(invoice: Invoice): void {
    this.selectedInvoice.set(invoice);
    this.paymentModalVisible.set(true);
  }

  closePaymentModal(): void {
    this.paymentModalVisible.set(false);
    this.selectedInvoice.set(null);
  }

  onPaymentRecorded(invoice: Invoice): void {
    this.replaceInList(invoice);
    this.closePaymentModal();
    this.auditLog('billing.payment', invoice.id);
  }

  // ---- Void ------------------------------------------------------------------

  openVoidConfirm(invoice: Invoice): void {
    this.voidingInvoiceId.set(invoice.id);
    this.voidModalVisible.set(true);
  }

  cancelVoid(): void {
    this.voidModalVisible.set(false);
    this.voidingInvoiceId.set(null);
  }

  confirmVoid(): void {
    const id = this.voidingInvoiceId();
    if (!id) return;

    this.voiding.set(true);
    this.voidInvoiceUseCase
      .execute(id)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => {
          this.voiding.set(false);
          this.voidModalVisible.set(false);
          this.voidingInvoiceId.set(null);
        }),
      )
      .subscribe((updated) => {
        if (updated) {
          this.toast.success('Invoice voided.');
          this.replaceInList(updated);
          this.auditLog('billing.void', id);
        }
      });
  }

  // ---- Internal helpers -----------------------------------------------------

  private replaceInList(updated: Invoice): void {
    this.invoices.update((list) =>
      list.map((inv) => (inv.id === updated.id ? updated : inv)),
    );
    const current = this.detailInvoice();
    if (current?.id === updated.id) {
      this.detailInvoice.set(updated);
    }
  }

  refresh(): void {
    const pid = this.patientId();
    if (pid) {
      this.loadInvoices(pid);
    }
  }
}
