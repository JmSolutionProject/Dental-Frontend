import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';
import jsPDF from 'jspdf';

import { AuthService } from '../../../../core/services/auth';
import { Modal } from '../../../../shared/components/modal/modal';
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { UpdateAppointmentUseCase } from '../../../appointments/application/update-appointment.usecase';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';
import { Patient } from '../../../patients/domain/patient';
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
  imports: [CurrencyPipe, DatePipe, Modal, ReactiveFormsModule, Table, TableCell],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentList implements OnInit {
  private readonly getPayments = inject(GetPaymentsUseCase);
  private readonly getPaymentMethods = inject(GetPaymentMethodsUseCase);
  private readonly createPayment = inject(CreatePaymentUseCase);
  private readonly getAppointments = inject(GetAppointmentsUseCase);
  private readonly updateAppointment = inject(UpdateAppointmentUseCase);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly payments = signal<Payment[]>([]);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly patients = signal<Patient[]>([]);

  readonly selectedPatientId = signal<string>('');
  readonly patientSearchQuery = signal<string>('');
  readonly showDropdown = signal<boolean>(false);
  
  readonly showReceiptModal = signal<boolean>(false);
  readonly selectedReceiptPayment = signal<Payment | null>(null);

  readonly filteredPatients = computed(() => {
    const q = this.patientSearchQuery().toLowerCase().trim();
    if (!q) return this.patients().slice(0, 30);
    return this.patients().filter((p) =>
      `${p.firstName} ${p.lastName} ${p.documentNumber}`.toLowerCase().includes(q),
    ).slice(0, 30);
  });
  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  readonly columns: TableColumn[] = [
    { key: 'payment', label: 'Pago' },
    { key: 'patientName', label: 'Paciente' },
    { key: 'cashierName', label: 'Cobrador' },
    { key: 'methodName', label: 'Método' },
    { key: 'amount', label: 'Monto' },
    { key: 'paidAt', label: 'Fecha' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Boleta PDF' },
  ];

  readonly summary = computed(() => {
    const payments = this.payments();
    return payments.length ? calculatePaymentSummary(payments) : createEmptyPaymentSummary();
  });

  readonly totalPages = computed(() => {
    if (this.total() <= 0 || this.pageSize() <= 0) return 1;
    return Math.ceil(this.total() / this.pageSize());
  });

  readonly cashierName = computed(() => this.auth.user()?.name || 'Administrador Principal');

  readonly filteredAppointments = computed(() => {
    const pid = this.selectedPatientId();
    if (!pid) return [];

    const paidAppointmentIds = new Set(
      this.payments()
        .filter((p) => p.status !== 'voided')
        .map((p) => String(p.appointmentId || (p as any).citaId))
        .filter(Boolean),
    );

    return this.appointments()
      .filter((a) => {
        const isMatchPatient = a.patientId === pid || String(a.patientId) === pid;
        const isNotCancelled = a.status !== 'cancelled';
        const isNotPaid = !paidAppointmentIds.has(String(a.id));
        return isMatchPatient && isNotCancelled && isNotPaid;
      })
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  });

  appointmentLabel(appointment: Appointment): string {
    const d = new Date(appointment.scheduledAt);
    const dateStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const services = (appointment.servicios ?? []).map((s) => s.servicio?.nombreServicio || '').filter(Boolean).join(', ');
    const serviceName = services ? services : (appointment.reason || 'Consulta Odontológica');
    const total = (appointment.servicios ?? []).reduce((sum, s) => sum + (s.servicio?.precio || 0) * s.cantidad, 0);
    const amountStr = total > 0 ? ` [S/ ${total.toFixed(2)}]` : '';

    return `📅 ${dateStr} ${timeStr} — ${serviceName}${amountStr}`;
  }

  readonly form = this.fb.group({
    appointmentId: ['', [Validators.required]],
    cashierId: [this.auth.user()?.sub || '1', [Validators.required]],
    methodId: ['', [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reference: [''],
    notes: [''],
    paidAt: [this.toDatetimeLocal(new Date()), [Validators.required]],
  });

  readonly isCash = signal(false);

  ngOnInit(): void {
    this.loadPayments();
    this.loadPaymentMethods();
    this.loadAppointments();
    this.loadPatients();

    this.form.get('methodId')?.valueChanges.subscribe((mid) => {
      const method = this.paymentMethods().find((m) => String(m.id) === String(mid));
      this.isCash.set(method?.name?.toLowerCase() === 'efectivo');
    });
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
      .subscribe((res) => {
        this.payments.set(res.data);
        this.total.set(res.total);
      });
  }

  loadAppointments(): void {
    this.getAppointments
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudieron cargar las citas.');
          return of([]);
        }),
      )
      .subscribe((appointments) => this.appointments.set(appointments));
  }

  loadPatients(): void {
    this.getPatients
      .execute({ page: 1, limit: 100 })
      .pipe(
        take(1),
        catchError(() => of({ data: [], total: 0, page: 1, limit: 100 })),
      )
      .subscribe((res) => this.patients.set(res.data));
  }

  // Resolve Real Patient Name
  resolvePatientName(payment: Payment): string {
    if (payment.patientName && payment.patientName !== 'Cliente General') {
      return payment.patientName;
    }
    // Match by patientId
    if (payment.patientId) {
      const p = this.patients().find((pat) => pat.id === payment.patientId || String(pat.id) === String(payment.patientId));
      if (p) return `${p.firstName} ${p.lastName}`;
    }
    // Match by appointmentId
    if (payment.appointmentId) {
      const apt = this.appointments().find((a) => a.id === payment.appointmentId || String(a.id) === String(payment.appointmentId));
      if (apt && apt.patientName) return apt.patientName;
    }
    return 'Paciente Odontológico';
  }

  // Resolve Treatment Details
  resolveTreatmentDetail(payment: Payment): string {
    if (payment.notes) return payment.notes;
    if (payment.appointmentId) {
      const apt = this.appointments().find((a) => a.id === payment.appointmentId || String(a.id) === String(payment.appointmentId));
      if (apt) {
        if (apt.reason) return apt.reason;
        if (apt.servicios && apt.servicios.length > 0) {
          return apt.servicios.map((s) => s.servicio?.nombreServicio || '').filter(Boolean).join(', ');
        }
      }
    }
    return 'Consulta / Tratamiento Odontológico';
  }

  onPatientChange(event: Event): void {
    const pid = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(pid);
    this.form.patchValue({ appointmentId: '' }, { emitEvent: false });
  }

  selectPatient(patient: any): void {
    this.selectedPatientId.set(patient.id);
    this.patientSearchQuery.set(`${patient.firstName} ${patient.lastName}`);
    this.showDropdown.set(false);
    this.form.patchValue({ appointmentId: '' }, { emitEvent: false });
  }

  getPatientName(id: string): string {
    const p = this.patients().find((p) => p.id === id);
    return p ? `${p.firstName} ${p.lastName} — ${p.documentNumber}` : 'Seleccione...';
  }

  hideDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onAppointmentSelected(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const apt = this.appointments().find((a) => a.id === id);
    if (apt) {
      const total = (apt.servicios ?? []).reduce((sum, s) => sum + s.servicio.precio * s.cantidad, 0);
      if (total > 0) {
        this.form.patchValue({ amount: total }, { emitEvent: false });
      }
    }
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
      cashierId: this.auth.user()?.sub || '1',
      paidAt: this.toDatetimeLocal(new Date()),
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedPatientId.set('');
    this.patientSearchQuery.set('');
    this.resetForm();
  }

  savePayment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Completa los datos obligatorios del pago.');
      return;
    }

    const raw = this.form.getRawValue();
    const amount = Number(raw.amount);
    const cashierId = String(raw.cashierId || this.auth.user()?.sub || '1');

    this.saving.set(true);
    this.createPayment
      .execute({
        appointmentId: String(raw.appointmentId),
        cashierId: cashierId,
        methodId: String(raw.methodId),
        amount,
        reference: raw.reference?.trim() || undefined,
        notes: raw.notes?.trim() || undefined,
        paidAt: raw.paidAt || undefined,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        take(1),
      )
      .subscribe({
        next: () => {
          this.toast.success('Pago registrado con éxito.');
          
          // Auto update appointment status to completed/atendida if not completed
          if (raw.appointmentId) {
            const apt = this.appointments().find((a) => a.id === raw.appointmentId || String(a.id) === String(raw.appointmentId));
            if (apt && apt.status !== 'completed') {
              this.updateAppointment.execute(raw.appointmentId, { status: 'completed' }).pipe(take(1)).subscribe({
                next: () => this.loadAppointments(),
              });
            }
          }

          this.closeForm();
          this.loadPayments();
          this.loadAppointments();
        },
        error: () => this.toast.error('No se pudo registrar el pago.'),
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

  changePageSizeValue(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadPayments();
  }

  statusLabel(status: any): string {
    return paymentStatusLabel(status);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'badge--success',
      inactive: 'badge--muted',
      voided: 'badge--danger',
    };

    return map[status] ?? 'badge--muted';
  }

  private loadLogoImage(): Promise<string> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve('');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = window.location.origin + '/assets/images/logo.svg';
    });
  }

  async generatePdfBoleta(payment?: Payment): Promise<void> {
    const p = payment || this.selectedReceiptPayment();
    if (!p) return;

    const realPatientName = this.resolvePatientName(p);
    const dateStr = p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE');
    const timeStr = p.paidAt ? new Date(p.paidAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
    const amountStr = `S/ ${p.amount.toFixed(2)}`;
    const methodStr = p.methodName || p.methodCode || 'Efectivo';
    const refStr = p.reference || p.id.slice(0, 8);
    const detailStr = this.resolveTreatmentDetail(p);
    const cashier = p.cashierName || this.cashierName();

    const logoBase64 = await this.loadLogoImage();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 1. Logo Position (Circular Logo on Left)
    let startX = 15;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 16, 16, 16);
        startX = 34;
      } catch {
        startX = 15;
      }
    }

    // 2. Header Left: Company Name & Tax Details (Strictly Spaced to Avoid Overlaps)
    doc.setTextColor(15, 23, 42); // Dark Navy #0f172a
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CLÍNICA DENTAL OMAYA', startX, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('RUC: 20601234567  •  Av. Javier Prado Este 1230, Lima', startX, 28);
    doc.text('Teléfono: +51 987 654 321  •  Email: contabilidad@clinicaomaya.com', startX, 33);

    // 3. Header Right: Document Title & Metadata (Slightly smaller & properly right-aligned)
    doc.setTextColor(14, 165, 233); // Cyan Sky Blue #0ea5e9
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BOLETA ELECTRÓNICA', 195, 22, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`N° ${refStr}`, 195, 27, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha: ${dateStr} ${timeStr}`, 195, 32, { align: 'right' });
    doc.text(`Generado por: ${cashier}`, 195, 37, { align: 'right' });

    // 4. Thick Navy Dividing Line (Matching Image 2 exact 2px line)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(15, 41, 195, 41);

    // 5. Section: Datos del Cliente (Customer Info Card)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 46, 180, 30, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DATOS DEL PACIENTE / CLIENTE', 20, 53);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Paciente:', 20, 61);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(realPatientName, 48, 61);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Método de Pago:', 20, 69);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(methodStr, 48, 69);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('N° Voucher / Op:', 120, 69);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(refStr, 155, 69);

    // 6. Section: Detalle del Tratamiento (Treatment Table)
    let y = 84;
    doc.setFillColor(15, 23, 42);
    doc.rect(15, y, 180, 9, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DESCRIPCIÓN / SERVICIO ODONTOLÓGICO', 20, y + 6);
    doc.text('IMPORTE', 188, y + 6, { align: 'right' });

    y += 9;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 22, 'D');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitDetail = doc.splitTextToSize(detailStr, 130);
    doc.text(splitDetail, 20, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.text(amountStr, 188, y + 8, { align: 'right' });

    // 7. Section: Resumen de Pago (Total Box)
    y += 30;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(110, y, 85, 22, 3, 3, 'FD');

    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL CANCELADO:', 115, y + 13);

    doc.setFontSize(16);
    doc.setTextColor(21, 128, 61);
    doc.text(amountStr, 190, y + 14, { align: 'right' });

    // 8. Footer Disclaimer (Clean ASCII Text without emoji encoding artifacts)
    y += 38;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('¡Gracias por su preferencia en Clínica Dental OMAYA!', 105, y, { align: 'center' });

    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Este documento es un comprobante de pago digital emitido por el Sistema de Gestión Clínica OMAYA.', 105, y, { align: 'center' });

    this.toast.success(`Boleta de ${realPatientName} descargada en PDF.`);

    // Save and download PDF file
    doc.save(`boleta_OMAYA_${realPatientName.replace(/\s+/g, '_')}_${refStr}.pdf`);
  }

  private resetForm(): void {
    this.form.reset({
      appointmentId: '',
      cashierId: this.auth.user()?.sub || '1',
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
