import {
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';

import { RecordPaymentUseCase } from '../../application/record-payment.usecase';
import {
  Invoice,
  PaymentMethod,
  paymentMethodLabel,
  RecordPaymentRequest,
} from '../../domain/invoice';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';

function outstandingValidator(getOutstanding: () => number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    if (num <= 0) return null;
    return num > getOutstanding()
      ? { exceedsOutstanding: { max: getOutstanding(), actual: num } }
      : null;
  };
}

@Component({
  selector: 'app-payment-modal',
  imports: [ReactiveFormsModule, CurrencyPipe, Modal],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
})
export class PaymentModal {
  invoice = input.required<Invoice>();
  visible = input(false);

  close = output<void>();
  paymentRecorded = output<Invoice>();

  private readonly recordPayment = inject(RecordPaymentUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);

  readonly form: FormGroup = this.fb.group({
    amount: [
      0,
      [
        Validators.required,
        Validators.min(0.01),
        outstandingValidator(() => this.invoice().outstanding),
      ],
    ],
    method: ['cash' as PaymentMethod, [Validators.required]],
    reference: [''],
  });

  readonly paymentMethods: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];

  methodLabel = paymentMethodLabel;

  closeModal(): void {
    this.form.reset({ amount: 0, method: 'cash', reference: '' });
    this.close.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data: RecordPaymentRequest = {
      amount: this.form.value.amount,
      method: this.form.value.method,
      reference: this.form.value.reference || undefined,
    };

    this.submitting.set(true);
    this.recordPayment
      .execute(this.invoice().id, data)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.toast.success('Payment recorded successfully.');
          this.paymentRecorded.emit(updated);
        }
      });
  }

  outstanding(): number {
    return this.invoice().outstanding;
  }

  paidSoFar(): number {
    return this.invoice().total - this.invoice().outstanding;
  }
}
