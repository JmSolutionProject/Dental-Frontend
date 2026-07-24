import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, of, take } from 'rxjs';

import { ToastService } from '../../../shared/components/toast/toast.service';
import { GetPatientsUseCase } from '../../patients/application/get-patients.usecase';
import { Patient } from '../../patients/domain/patient';
import { GetMessagesUseCase } from '../application/get-messages.usecase';
import { GetWhatsAppQrUseCase } from '../application/get-whatsapp-qr.usecase';
import { GetWhatsAppStatusUseCase } from '../application/get-whatsapp-status.usecase';
import { SendWhatsAppMessageUseCase } from '../application/send-whatsapp-message.usecase';
import { Message, WhatsAppStatus } from '../domain/messages';
import QRCode from 'qrcode';

export type MessageSection = 'direct' | 'scheduled' | 'templates';
export type ScheduledStatus = 'pending' | 'sent' | 'failed';
export type Frequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ScheduledRecipient {
  patient: Patient;
  content: string;
}

export interface ScheduledMessageItem {
  id: number;
  recipient: string;
  content: string;
  scheduledAt: string;
  frequency: Frequency;
  status: ScheduledStatus;
}

export interface MessageTemplateItem {
  id: number;
  name: string;
  category: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class MessageCenterStore {
  private readonly getMessages = inject(GetMessagesUseCase);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly getWhatsAppStatus = inject(GetWhatsAppStatusUseCase);
  private readonly getWhatsAppQr = inject(GetWhatsAppQrUseCase);
  private readonly sendWhatsAppMessage = inject(SendWhatsAppMessageUseCase);
  private readonly toast = inject(ToastService);

  // ---- estado base ----
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

  readonly scheduledMessages = signal<ScheduledMessageItem[]>([
    {
      id: 1,
      recipient: 'Lista: pacientes por confirmar',
      content: 'Hola {{nombre}}, te recordamos confirmar tu cita programada.',
      scheduledAt: this.toDatetimeLocal(this.addHours(new Date(), 3)),
      frequency: 'once',
      status: 'pending',
    },
  ]);

  readonly templates = signal<MessageTemplateItem[]>([
    {
      id: 1,
      name: 'Recordatorio de cita',
      category: 'Recordatorio',
      content: 'Hola {{nombre}}, te recordamos que tu cita es el {{fecha}}. Si necesitás reprogramar, respondé este mensaje.',
    },
    {
      id: 2,
      name: 'Pago pendiente',
      category: 'Recordatorio de pago',
      content: 'Hola {{nombre}}, tenés un pago pendiente por tu tratamiento. Podés acercarte a recepción o responder este WhatsApp.',
    },
    {
      id: 3,
      name: 'Bienvenida',
      category: 'Bienvenida',
      content: 'Hola {{nombre}}, te damos la bienvenida a la clínica. Estamos para ayudarte con cualquier consulta.',
    },
  ]);

  // ---- coordinación entre paneles (usar plantilla) ----
  readonly requestedSection = signal<MessageSection | null>(null);
  readonly pendingDirectContent = signal<string | null>(null);
  readonly pendingScheduledContent = signal<string | null>(null);

  private scheduledTimer: ReturnType<typeof setTimeout> | null = null;

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
        if (!status.ready) this.loadQr();
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

  sendImmediate(recipients: ScheduledRecipient[], onDone: () => void) {
    this.sending.set(true);
    this.sendRecipientsSequentially(recipients, 0, onDone);
  }

  sendImmediateToPhone(phone: string, content: string, onDone: () => void) {
    this.sending.set(true);
    this.sendWhatsAppMessage
      .executeDirect(phone, { content })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error(`No se pudo enviar el mensaje a ${phone}.`);
          return of(null);
        }),
        finalize(() => this.sending.set(false)),
      )
      .subscribe((response) => {
        if (!response) return;
        this.toast.success(response.message || `Mensaje enviado a ${phone}.`);
        this.loadMessages();
        onDone();
      });
  }

  private sendRecipientsSequentially(recipients: ScheduledRecipient[], index: number, onDone: () => void) {
    const recipient = recipients[index];
    if (!recipient) {
      this.sending.set(false);
      this.toast.success('Mensajes enviados por WhatsApp.');
      this.loadMessages();
      onDone();
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
        this.sendRecipientsSequentially(recipients, index + 1, onDone);
      });
  }

  startScheduledSend(recipients: ScheduledRecipient[], intervalSeconds: number) {
    this.clearScheduledTimer();
    this.scheduledQueue.set(recipients);
    this.scheduledSentCount.set(0);
    this.scheduledFailedCount.set(0);
    this.scheduledRunning.set(true);
    this.toast.info(`Programación iniciada para ${recipients.length} mensaje(s).`);
    this.processScheduledQueue(intervalSeconds);
  }

  private processScheduledQueue(intervalSeconds: number) {
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
        if (response) this.scheduledSentCount.update((count) => count + 1);
        this.scheduledQueue.set(remaining);

        if (remaining.length === 0) {
          this.processScheduledQueue(intervalSeconds);
          return;
        }

        this.scheduledTimer = setTimeout(() => this.processScheduledQueue(intervalSeconds), intervalSeconds * 1000);
      });
  }

  stopScheduledSend() {
    this.clearScheduledTimer();
    this.scheduledRunning.set(false);
    this.scheduledQueue.set([]);
    this.nextScheduledPatient.set(null);
    this.toast.info('Envío programado detenido.');
  }

  scheduleMessage(value: {
    recipient: string;
    content: string;
    scheduledAt: string;
    frequency: Frequency;
  }) {
    this.scheduledMessages.update((messages) => [
      {
        id: Date.now(),
        recipient: this.resolveScheduledRecipient(value.recipient),
        content: value.content.trim(),
        scheduledAt: value.scheduledAt,
        frequency: value.frequency,
        status: 'pending',
      },
      ...messages,
    ]);
    this.toast.success('Mensaje programado correctamente.');
  }

  cancelScheduled(id: number, notify = true) {
    this.scheduledMessages.update((messages) => messages.filter((message) => message.id !== id));
    if (notify) this.toast.info('Mensaje programado cancelado.');
  }

  saveTemplate(value: { name: string; category: string; content: string }) {
    this.templates.update((templates) => [
      {
        id: Date.now(),
        name: value.name.trim(),
        category: value.category.trim(),
        content: value.content.trim(),
      },
      ...templates,
    ]);
    this.toast.success('Plantilla creada correctamente.');
  }

  useTemplate(content: string, target: 'direct' | 'scheduled') {
    if (target === 'scheduled') {
      this.pendingScheduledContent.set(content);
      this.requestedSection.set('scheduled');
    } else {
      this.pendingDirectContent.set(content);
      this.requestedSection.set('direct');
    }
  }

  renderTemplate(patient: Patient, template: string, service: string): string {
    const values: Record<string, string> = {
      nombre: patient.firstName,
      apellido: patient.lastName,
      telefono: patient.phone || '',
      documento: patient.documentNumber || '',
      servicio: service.trim(),
      fecha: new Date().toLocaleDateString('es-PE'),
    };

    return template.replace(/{{\s*(nombre|apellido|telefono|documento|servicio|fecha)\s*}}/gi, (_, key: string) => {
      return values[key.toLowerCase()] ?? '';
    });
  }

  resolveScheduledRecipient(recipient: string): string {
    if (recipient === 'all') return 'Todos los contactos';
    if (recipient.startsWith('group:')) return recipient.replace('group:', 'Grupo: ');
    const patient = this.patients().find((p) => p.id === recipient);
    return patient ? this.patientName(patient) : recipient;
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
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
      const image = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
      this.qrImage.set(image);
    } catch {
      this.qrImage.set(null);
      this.toast.error('No se pudo generar la imagen del QR.');
    }
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private toDatetimeLocal(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private clearScheduledTimer() {
    if (!this.scheduledTimer) return;
    clearTimeout(this.scheduledTimer);
    this.scheduledTimer = null;
  }
}
