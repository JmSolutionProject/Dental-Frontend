import { CurrencyPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';

export interface PaymentRecord {
  id: string;
  date: string;
  concept: string;
  method: string;
  amount: number;
}

@Component({
  selector: 'app-patient-payments-tab',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './patient-payments-tab.html',
  styleUrl: './patient-payments-tab.css'
})
export class PatientPaymentsTab {
  budgetPaid = input.required<number>();
  budgetPending = input.required<number>();

  readonly paymentsHistory = signal<PaymentRecord[]>([
    { id: '1', date: '15/07/2026', concept: 'Abono Limpieza e Higiene Ultrasónica', method: 'Yape / Plin', amount: 120 },
    { id: '2', date: '05/06/2026', concept: 'Consulta Inicial Diagnóstico', method: 'Efectivo', amount: 50 },
  ]);
}
