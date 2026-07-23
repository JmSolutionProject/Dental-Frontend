import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import QRCode from 'qrcode';
import { catchError, finalize, of, take } from 'rxjs';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';
import { Patient } from '../../../patients/domain/patient';
import { GetMessagesUseCase } from '../../application/get-messages.usecase';
import { GetWhatsAppQrUseCase } from '../../application/get-whatsapp-qr.usecase';
import { GetWhatsAppStatusUseCase } from '../../application/get-whatsapp-status.usecase';
import { SendWhatsAppMessageUseCase } from '../../application/send-whatsapp-message.usecase';
import { Message, WhatsAppStatus } from '../../domain/messages';

type SendMode = 'now' | 'scheduled';

interface ScheduledRecipient {
  patient: Patient;
  content: string;
}

@Component({
  selector: 'app-message-list',
  imports: [DatePipe, FormField, ReactiveFormsModule],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList implements OnDestroy {
  private readonly getMessages = inject(GetMessagesUseCase);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getWhatsAppStatus = inject(GetWhatsAppStatusUseCase);
  private readonly getWhatsAppQr = inject(GetWhatsAppQrUseCase);
  private readonly sendWhatsAppMessage = inject(SendWhatsAppMessageUseCase);
  private readonly toast = inject(ToastService);

  readonly messages = signal<Message[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly whatsappStatus = signal<WhatsAppStatus | null>(null);
  readonly qr = signal<string | null>(null);
  readonly qrImage = signal<string | null>(null);
  readonly loadingMessages = signal(false);
  readonly loadingPatients = signal(false);
  readonly loadingStatus = signal(false);
  readonly loadingQr = signal(false);
  readonly sending = signal(false);
  readonly scheduledRunning = signal(false);
  readonly scheduledQueue = signal<ScheduledRecipient[]>([]);
  readonly scheduledSentCount = signal(0);
  readonly scheduledFailedCount = signal(0);
  readonly nextScheduledPatient = signal<string | null>(null);

  private scheduledTimer: ReturnType<typeof setTimeout> | null = null;

  readonly sendForm = new FormGroup({
    patientPicker: new FormControl('', {
      nonNullable: true,
    }),
    patientIds: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),
    service: new FormControl('', {
      nonNullable: true,
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    mode: new FormControl<SendMode>('now', {
      nonNullable: true,
    }),
    intervalSeconds: new FormControl(40, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(40), Validators.max(180)],
    }),
  });

  readonly scheduledPendingCount = computed(() => this.scheduledQueue().length);

  readonly statusLabel = computed(() => {
    const status = this.whatsappStatus();
    if (!status) return 'Sin consultar';
    if (status.ready) return 'Conectado';
    if (status.status === 'qr') return 'Esperando escaneo de QR';
    if (status.status === 'authenticated') return 'Autenticado';
    if (status.status === 'disconnected') return 'Desconectado';
    return status.message || status.status;
  });

  readonly statusClass = computed(() =>
    this.whatsappStatus()?.ready ? 'status--ready' : 'status--pending',
  );

  constructor() {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.clearScheduledTimer();
  }

  loadInitialData() {
    this.loadMessages();
    this.loadPatients();
    this.refreshWhatsApp();
  }

  loadMessages() {
    this.loadingMessages.set(true);
    this.getMessages
      .execute({ page: 1, limit: 10 })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudieron cargar los mensajes.');
          return of({ data: [], total: 0, page: 1, limit: 10 });
        }),
        finalize(() => this.loadingMessages.set(false)),
      )
      .subscribe((result) => this.messages.set(result.data));
  }

  loadPatients() {
    this.loadingPatients.set(true);
    this.getPatients
      .execute({ page: 1, limit: 100 })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudieron cargar los pacientes.');
          return of({ data: [], total: 0, page: 1, limit: 100 });
        }),
        finalize(() => this.loadingPatients.set(false)),
      )
      .subscribe((result) => this.patients.set(result.data));
  }

  refreshWhatsApp() {
    this.loadingStatus.set(true);
    this.getWhatsAppStatus
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo consultar el estado de WhatsApp.');
          return of({ status: 'error', ready: false });
        }),
        finalize(() => this.loadingStatus.set(false)),
      )
      .subscribe((status) => {
        this.whatsappStatus.set(status);
        if (!status.ready) {
          this.loadQr();
        }
      });
  }

  loadQr() {
    this.loadingQr.set(true);
    this.getWhatsAppQr
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo cargar el QR de WhatsApp.');
          return of({ qr: null });
        }),
        finalize(() => this.loadingQr.set(false)),
      )
      .subscribe((response) => {
        this.qr.set(response.qr);
        void this.renderQr(response.qr);
      });
  }

  submit() {
    if (this.sendForm.invalid || this.sending()) {
      this.sendForm.markAllAsTouched();
      return;
    }

    const value = this.sendForm.getRawValue();
    const patients = this.selectedPatients();
    if (patients.length === 0) {
      this.toast.info('Seleccioná al menos un paciente.');
      return;
    }

    const recipients = patients.map((patient) => ({
      patient,
      content: this.renderTemplate(patient, value.content.trim()),
    }));

    if (value.mode === 'scheduled') {
      this.startScheduledSend(recipients);
      return;
    }

    this.sendImmediate(recipients);
  }

  stopScheduledSend() {
    this.clearScheduledTimer();
    this.scheduledRunning.set(false);
    this.scheduledQueue.set([]);
    this.nextScheduledPatient.set(null);
    this.toast.info('Envío programado detenido.');
  }

  selectTemplate(template: string) {
    this.sendForm.controls.content.setValue(template);
  }

  addSelectedPatient() {
    const patientId = this.sendForm.controls.patientPicker.value;
    if (!patientId) return;

    const current = this.sendForm.controls.patientIds.value;
    if (!current.includes(patientId)) {
      this.sendForm.controls.patientIds.setValue([...current, patientId]);
    }

    this.sendForm.controls.patientPicker.setValue('');
    this.sendForm.controls.patientIds.markAsTouched();
  }

  removeSelectedPatient(patientId: string) {
    this.sendForm.controls.patientIds.setValue(
      this.sendForm.controls.patientIds.value.filter((id) => id !== patientId),
    );
  }

  selectAllPatients() {
    this.sendForm.controls.patientIds.setValue(this.patients().map((patient) => patient.id));
  }

  clearPatientSelection() {
    this.sendForm.controls.patientIds.setValue([]);
  }

  selectedPatients(): Patient[] {
    const ids = new Set(this.sendForm.controls.patientIds.value);
    return this.patients().filter((patient) => ids.has(patient.id));
  }

  messagePreview(): string {
    const patient = this.selectedPatients()[0] ?? this.patients()[0];
    const template = this.sendForm.controls.content.value;
    return patient ? this.renderTemplate(patient, template) : template;
  }

  templateHelp(): string {
    return '{{ nombre }}, {{ apellido }}, {{ telefono }}, {{ documento }}, {{ servicio }}';
  }

  private sendImmediate(recipients: ScheduledRecipient[]) {
    this.sending.set(true);
    this.sendRecipientsSequentially(recipients, 0);
  }

  private sendRecipientsSequentially(recipients: ScheduledRecipient[], index: number) {
    const recipient = recipients[index];
    if (!recipient) {
      this.sending.set(false);
      this.toast.success('Mensajes enviados por WhatsApp.');
      this.sendForm.controls.content.reset();
      this.loadMessages();
      return;
    }

    this.sendWhatsAppMessage
      .execute(recipient.patient.id, { content: recipient.content })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error(`No se pudo enviar el mensaje a ${this.patientName(recipient.patient)}.`);
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.toast.success(response.message || `Mensaje enviado a ${this.patientName(recipient.patient)}.`);
        }
        this.sendRecipientsSequentially(recipients, index + 1);
      });
  }

  private startScheduledSend(recipients: ScheduledRecipient[]) {
    this.clearScheduledTimer();
    this.scheduledQueue.set(recipients);
    this.scheduledSentCount.set(0);
    this.scheduledFailedCount.set(0);
    this.scheduledRunning.set(true);
    this.toast.info(`Programación iniciada para ${recipients.length} mensaje(s).`);
    this.processScheduledQueue();
  }

  private processScheduledQueue() {
    const [recipient, ...remaining] = this.scheduledQueue();
    if (!recipient) {
      this.scheduledRunning.set(false);
      this.nextScheduledPatient.set(null);
      this.toast.success('Envío programado finalizado.');
      this.loadMessages();
      return;
    }

    this.nextScheduledPatient.set(this.patientName(recipient.patient));
    this.sendWhatsAppMessage
      .execute(recipient.patient.id, { content: recipient.content })
      .pipe(
        take(1),
        catchError(() => {
          this.scheduledFailedCount.update((count) => count + 1);
          this.toast.error(`No se pudo enviar el mensaje a ${this.patientName(recipient.patient)}.`);
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.scheduledSentCount.update((count) => count + 1);
        }
        this.scheduledQueue.set(remaining);

        if (remaining.length === 0) {
          this.processScheduledQueue();
          return;
        }

        const intervalMs = this.sendForm.controls.intervalSeconds.value * 1000;
        this.scheduledTimer = setTimeout(() => this.processScheduledQueue(), intervalMs);
      });
  }

  private renderTemplate(patient: Patient, template: string): string {
    const values: Record<string, string> = {
      nombre: patient.firstName,
      apellido: patient.lastName,
      telefono: patient.phone || '',
      documento: patient.documentNumber || '',
      servicio: this.sendForm.controls.service.value.trim(),
    };

    return template.replace(/{{\s*(nombre|apellido|telefono|documento|servicio)\s*}}/gi, (_, key: string) => {
      return values[key.toLowerCase()] ?? '';
    });
  }

  private clearScheduledTimer() {
    if (!this.scheduledTimer) return;
    clearTimeout(this.scheduledTimer);
    this.scheduledTimer = null;
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  qrImageSrc(): string | null {
    return this.qrImage();
  }

  private async renderQr(value: string | null) {
    if (!value) {
      this.qrImage.set(null);
      return;
    }

    if (value.startsWith('data:')) {
      this.qrImage.set(value);
      return;
    }

    try {
      const image = await QRCode.toDataURL(value, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 280,
      });
      this.qrImage.set(image);
    } catch {
      this.qrImage.set(null);
      this.toast.error('No se pudo generar la imagen del QR.');
    }
  }
}
