import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';

import { AuthService } from '../../../../core/services/auth';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { Appointment } from '../../../appointments/domain/appointment';
import { CreatePaymentUseCase } from '../../application/create-payment.usecase';
import { GetPaymentMethodsUseCase } from '../../application/get-payment-methods.usecase';
import { GetPaymentsUseCase } from '../../application/get-payments.usecase';
import {
  calculatePaymentSummary,
  createEmptyPaymentSummary,
  Payment,
  PaymentMethod,
  paymentStatusLabel,
} from '../../domain/payment';

@Component({
  selector: 'app-payment-list',
  imports: [CurrencyPipe, DatePipe, Modal, ReactiveFormsModule],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentList implements OnInit {
  private readonly getPayments = inject(GetPaymentsUseCase);
  private readonly getPaymentMethods = inject(GetPaymentMethodsUseCase);
  private readonly createPayment = inject(CreatePaymentUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly payments = signal<Payment[]>([]);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  readonly summary = computed(() => {
    const payments = this.payments();
    return payments.length ? calculatePaymentSummary(payments) : createEmptyPaymentSummary();
  });

  readonly totalPages = computed(() => {
    if (this.total() <= 0 || this.pageSize() <= 0) return 1;
    return Math.ceil(this.total() / this.pageSize());
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const first = Math.max(1, Math.min(current - 3, total - 6));
    const last = Math.min(total, first + 6);
    const pages: number[] = [];

    for (let page = first; page <= last; page += 1) {
      pages.push(page);
    }

    return pages;
  });

  readonly firstItem = computed(() => {
    if (this.total() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly lastItem = computed(() => Math.min(this.currentPage() * this.pageSize(), this.total()));

  readonly cashierName = computed(() => this.auth.user()?.name || 'Usuario actual');

  readonly form = this.fb.group({
    appointmentId: ['', [Validators.required]],
    cashierId: [this.auth.user()?.sub ?? '', [Validators.required]],
    methodId: ['', [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reference: [''],
    notes: [''],
    paidAt: [this.toDatetimeLocal(new Date()), [Validators.required]],
  });

  ngOnInit(): void {
    this.loadPayments();
    this.loadPaymentMethods();
    this.loadAppointments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.getPayments
      .execute({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchText().trim() || undefined,
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudieron cargar los pagos.');
          return of({ data: [], total: 0, page: this.currentPage(), limit: this.pageSize() });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        this.payments.set(result.data);
        this.total.set(result.total);
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.currentPage.set(1);
    this.loadPayments();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPayments();
  }

  changePageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(value) || value <= 0) return;

    this.pageSize.set(value);
    this.currentPage.set(1);
    this.loadPayments();
  }

  loadAppointments(): void {
    this.getAppointments
      .execute()
      .pipe(
        take(1),
        catchError(() => of([])),
      )
      .subscribe((appointments) => this.appointments.set(appointments));
  }

  loadPaymentMethods(): void {
    this.getPaymentMethods
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudieron cargar los métodos de pago.');
          return of([]);
        }),
      )
      .subscribe((methods) => this.paymentMethods.set(methods));
  }

  openForm(): void {
    if (this.paymentMethods().length === 0) {
      this.loadPaymentMethods();
    }

    this.form.patchValue({
      cashierId: this.auth.user()?.sub ?? '',
      paidAt: this.toDatetimeLocal(new Date()),
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  savePayment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Completa los datos obligatorios del pago.');
      return;
    }

    const raw = this.form.getRawValue();
    const amount = Number(raw.amount);

    this.saving.set(true);
    this.createPayment
      .execute({
        appointmentId: raw.appointmentId!,
        cashierId: raw.cashierId!,
        methodId: String(raw.methodId),
        amount,
        reference: raw.reference?.trim() || undefined,
        notes: raw.notes?.trim() || undefined,
        paidAt: raw.paidAt ? new Date(raw.paidAt).toISOString() : undefined,
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo registrar el pago.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((payment) => {
        if (!payment) return;

        this.toast.success('Pago registrado correctamente.');
        this.payments.update((current) => [payment, ...current]);
        this.total.update((value) => value + 1);
        this.resetForm();
        this.closeForm();
      });
  }

  statusLabel = paymentStatusLabel;

  statusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'badge--success',
      inactive: 'badge--muted',
      voided: 'badge--danger',
    };

    return map[status] ?? 'badge--muted';
  }

  appointmentLabel(appointment: Appointment): string {
    const date = new Date(appointment.scheduledAt).toLocaleDateString('es-PE');
    return `#${appointment.id} - ${appointment.patientName} - ${date}`;
  }

  private resetForm(): void {
    this.form.reset({
      appointmentId: '',
      cashierId: this.auth.user()?.sub ?? '',
      methodId: '',
      amount: 0,
      reference: '',
      notes: '',
      paidAt: this.toDatetimeLocal(new Date()),
    });
  }

  private toDatetimeLocal(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }
}
