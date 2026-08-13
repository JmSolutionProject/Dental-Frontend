import { Component, inject, input, signal, computed, effect, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { Appointment } from '../../../appointments/domain/appointment';
import { PaymentMethod, CreatePaymentRequest } from '../../../payments/domain/payment';
import { CreatePaymentUseCase } from '../../../payments/application/create-payment.usecase';
import { GetPaymentMethodsUseCase } from '../../../payments/application/get-payment-methods.usecase';
import { GetPaymentsUseCase } from '../../../payments/application/get-payments.usecase';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../shared/components/toast/toast.service';

interface PaymentRow {
  id: string;
  date: string;
  concept: string;
  method: string;
  amount: number;
  planServicioId?: string | null;
}

@Component({
  selector: 'app-patient-payments-tab',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './patient-payments-tab.html',
  styleUrl: './patient-payments-tab.css',
})
export class PatientPaymentsTab {
  private readonly fb = inject(FormBuilder);
  private readonly createPayment = inject(CreatePaymentUseCase);
  private readonly getMethods = inject(GetPaymentMethodsUseCase);
  private readonly getPayments = inject(GetPaymentsUseCase);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly appointments = input<Appointment[]>([]);
  readonly patientId = input<string>('');
  readonly budgetTotal = input<number>(0);
  readonly paymentAdded = output<void>();

  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly history = signal<PaymentRow[]>([]);
  readonly savingPayment = signal(false);
  readonly showForm = signal(false);

  readonly realTotal = computed(() =>
    this.history().reduce((sum, row) => sum + row.amount, 0)
  );

  readonly planPaid = computed(() =>
    this.history()
      .filter((row) => row.planServicioId)
      .reduce((sum, row) => sum + row.amount, 0)
  );

  readonly pending = computed(() =>
    Math.max(0, this.budgetTotal() - this.planPaid())
  );

  needsReference(): boolean {
    const mid = this.paymentForm.get('methodId')?.value;
    if (!mid) return false;
    const method = this.paymentMethods().find((m) => String(m.id) === String(mid));
    const name = (method?.name ?? '').toUpperCase();
    return name.includes('YAPE') || name.includes('TRANSFERENCIA');
  }

  methodClass(method: string): string {
    const m = (method || '').toUpperCase();
    if (m.includes('EFECTIVO')) return 'badge--success';
    if (m.includes('TARJETA') || m.includes('POS') || m.includes('VISA') || m.includes('MASTERCARD')) return 'badge--warning';
    if (m.includes('YAPE') || m.includes('PLIN') || m.includes('TRANSFERENCIA') || m.includes('DEPOSITO') || m.includes('BILLETERA')) return 'badge--primary';
    return 'badge--muted';
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  readonly paymentForm = this.fb.group({
    appointmentId: ['', Validators.required],
    methodId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reference: [''],
    notes: [''],
  });

  constructor() {
    this.loadMethods();
    effect(() => {
      if (this.patientId()) {
        this.loadHistory();
      }
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.paymentForm.reset({ amount: 0 });
    }
  }

  onAppointmentSelected(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const apt = this.appointments().find((a) => a.id === id);
    if (apt) {
      const total = (apt.servicios ?? []).reduce((sum, s) => sum + s.servicio.precio * s.cantidad, 0);
      const motivo = (apt.servicios ?? []).map((s) => s.servicio.nombreServicio).join(', ');
      this.paymentForm.patchValue({
        notes: motivo ? `${motivo} — ${apt.dentistName ?? ''}` : `${apt.reason} — ${apt.dentistName ?? ''}`,
        amount: total > 0 ? total : this.pending(),
      }, { emitEvent: false });
    }
  }

  registerPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const fv = this.paymentForm.getRawValue();
    const aptId = fv.appointmentId as string;
    const methodId = fv.methodId as string;
    const amount = Number(fv.amount) || 0;

    const cashierId = this.auth.user()?.sub ?? '1';
    const apt = this.appointments().find((a) => a.id === aptId);

    const request: CreatePaymentRequest = {
      appointmentId: aptId,
      cashierId,
      methodId,
      amount,
      reference: (fv.reference as string)?.trim() || undefined,
      notes: (fv.notes as string)?.trim() || undefined,
      paidAt: new Date().toISOString(),
    };

    this.savingPayment.set(true);
    this.createPayment.execute(request)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al registrar el cobro.');
          return of(null);
        }),
        finalize(() => this.savingPayment.set(false)),
      )
      .subscribe((result) => {
        if (result) {
          this.toast.success('Cobro registrado exitosamente.');
          this.paymentForm.reset({ amount: 0 });
          this.showForm.set(false);
          this.paymentAdded.emit();
          this.history.update((list) => [
            {
              id: result.id,
              date: this.formatDate(result.paidAt),
              concept: `${apt?.reason ?? 'Pago'} — ${apt?.patientName ?? ''}`,
              method: result.methodName || '—',
              amount: result.amount,
              planServicioId: result.planServicioId,
            },
            ...list,
          ]);
        }
      });
  }

  private loadMethods(): void {
    this.getMethods.execute()
      .pipe(take(1), catchError(() => of([])))
      .subscribe((methods) => this.paymentMethods.set(methods));
  }

  private loadHistory(): void {
    const pid = this.patientId();
    if (!pid) return;
    this.getPayments.execute({ patientId: pid, limit: 100 })
      .pipe(take(1), catchError(() => of({ data: [], total: 0, page: 1, limit: 10 })))
      .subscribe((res) => {
        this.history.set(res.data
          .slice()
          .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
          .map((p) => ({
            id: p.id,
            date: this.formatDate(p.paidAt),
            concept: p.notes || 'Pago',
            method: p.methodName || '—',
            amount: p.amount,
            planServicioId: p.planServicioId,
          })));
      });
  }
}
