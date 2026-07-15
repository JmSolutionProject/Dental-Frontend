import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { take, catchError, of, finalize, EMPTY } from 'rxjs';

import { CreateQuoteUseCase } from '../../application/create-quote.usecase';
import { AuditService } from '../../../../core/services/audit.service';
import {
  CreateInvoiceRequest,
  InvoiceLineItem,
} from '../../domain/invoice';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-quote-form',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css',
})
export class QuoteForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly createQuote = inject(CreateQuoteUseCase);
  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly patientId = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly form: FormGroup = this.fb.group({
    notes: [''],
    items: this.fb.array([]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  constructor() {
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.toast.error('Patient ID not found.');
        this.router.navigate(['/patients']);
        return;
      }
      this.patientId.set(id);
      this.addItem(); // start with one empty line
    });
  }

  // ---- Line item management ------------------------------------------------

  addItem(): void {
    this.items.push(
      this.fb.group({
        description: ['', [Validators.required]],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        toothNumber: [null],
        procedureId: [''],
      }),
    );
  }

  getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  itemTotal(index: number): number {
    const group = this.items.at(index) as FormGroup;
    const qty = group.get('quantity')?.value ?? 0;
    const price = group.get('unitPrice')?.value ?? 0;
    return qty * price;
  }

  grandTotal(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.itemTotal(i);
    }
    return total;
  }

  // ---- Submit --------------------------------------------------------------

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fill in all required fields.');
      return;
    }

    if (this.items.length === 0) {
      this.toast.error('Add at least one line item.');
      return;
    }

    const pid = this.patientId();
    if (!pid) return;

    const items: Omit<InvoiceLineItem, 'id' | 'invoiceId'>[] =
      this.items.controls.map((ctrl) => {
        const g = ctrl as FormGroup;
        return {
          description: g.value.description,
          quantity: g.value.quantity,
          unitPrice: g.value.unitPrice,
          total: g.value.quantity * g.value.unitPrice,
          toothNumber: g.value.toothNumber ?? undefined,
          procedureId: g.value.procedureId || undefined,
        };
      });

    const data: CreateInvoiceRequest = {
      patientId: pid,
      items,
      notes: this.form.value.notes || undefined,
    };

    this.submitting.set(true);
    this.createQuote
      .execute(data)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe((invoice) => {
        if (invoice) {
          this.toast.success('Quote created successfully.');
          this.audit
            .log('billing.quote_created', { invoiceId: invoice.id })
            .pipe(catchError(() => EMPTY))
            .subscribe();
          this.router.navigate(['/patients', pid, 'billing']);
        }
      });
  }

  // ---- Navigation ----------------------------------------------------------

  cancel(): void {
    const pid = this.patientId();
    if (pid) {
      this.router.navigate(['/patients', pid, 'billing']);
    } else {
      this.router.navigate(['/patients']);
    }
  }
}
