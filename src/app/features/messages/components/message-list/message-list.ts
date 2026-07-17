import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-message-list',
  imports: [DatePipe, FormField, ReactiveFormsModule],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
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

  readonly sendForm = new FormGroup({
    patientId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
  });

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
    this.sending.set(true);

    this.sendWhatsAppMessage
      .execute(value.patientId, { content: value.content.trim() })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo enviar el mensaje de WhatsApp.');
          return of(null);
        }),
        finalize(() => this.sending.set(false)),
      )
      .subscribe((response) => {
        if (!response) return;
        this.toast.success(response.message || 'Mensaje enviado por WhatsApp.');
        this.sendForm.controls.content.reset();
        this.loadMessages();
      });
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
