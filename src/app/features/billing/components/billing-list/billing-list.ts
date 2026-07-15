import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take, catchError, of, finalize, tap } from 'rxjs';

import { GetPatientInvoicesUseCase } from '../../application/get-patient-invoices.usecase';
import { ConvertToInvoiceUseCase } from '../../application/convert-to-invoice.usecase';
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
  private readonly toast = inject(ToastService);

  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly patientId = signal<string | null>(null);

  // Payment modal state
  readonly paymentModalVisible = signal(false);
  readonly selectedInvoice = signal<Invoice | null>(null);

  // Convert confirmation
  readonly convertModalVisible = signal(false);
  readonly convertingInvoiceId = signal<string | null>(null);
  readonly converting = signal(false);

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
        catchError(() => {
          this.toast.error('Failed to load invoices.');
          return of([]);
        }),
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

  // ---- Actions --------------------------------------------------------------

  viewInvoice(invoice: Invoice): void {
    const pid = this.patientId();
    if (!pid) return;
    this.router.navigate(['/patients', pid, 'billing', invoice.id]);
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
        catchError(() => {
          this.toast.error('Failed to convert quote to invoice.');
          return of(null);
        }),
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
  }

  // ---- Internal helpers -----------------------------------------------------

  private replaceInList(updated: Invoice): void {
    this.invoices.update((list) =>
      list.map((inv) => (inv.id === updated.id ? updated : inv)),
    );
  }

  refresh(): void {
    const pid = this.patientId();
    if (pid) {
      this.loadInvoices(pid);
    }
  }
}
