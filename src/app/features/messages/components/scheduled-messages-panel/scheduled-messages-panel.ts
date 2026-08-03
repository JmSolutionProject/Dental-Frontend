import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';

import { Modal } from '../../../../shared/components/modal/modal';
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { Frequency, MessageCenterStore, ScheduledMessageItem } from '../messages-center.store';
import { WhatsAppMediaAttachment } from '../../domain/messages';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-scheduled-messages-panel',
  imports: [Modal, ReactiveFormsModule, Table, TableCell, NgIcon],
  providers: [
    provideIcons({heroPlus})
  ],
  templateUrl: './scheduled-messages-panel.html',
  styleUrl: './scheduled-messages-panel.css',
})
export class ScheduledMessagesPanel {
  readonly store = inject(MessageCenterStore);
  readonly showScheduleModal = signal(false);
  readonly attachment = signal<WhatsAppMediaAttachment | null>(null);
  readonly uploadingAttachment = signal(false);

  readonly scheduledColumns: TableColumn[] = [
    { key: 'recipient', label: 'Destinatario' },
    { key: 'content', label: 'Mensaje' },
    { key: 'scheduledAt', label: 'Fecha/Hora' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Acciones', align: 'right' },
  ];

  readonly scheduleForm = new FormGroup({
    recipient: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(1)] }),
    scheduledAt: new FormControl(this.toDatetimeLocal(this.addHours(new Date(), 1)), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frequency: new FormControl<Frequency>('once', { nonNullable: true }),
  });

  readonly scheduleCharacterCount = computed(() => this.scheduleForm.controls.content.value.length);

  constructor() {
    effect(() => {
      const content = this.store.pendingScheduledContent();
      if (content !== null) {
        this.scheduleForm.controls.content.setValue(content);
        this.store.pendingScheduledContent.set(null);
        this.showScheduleModal.set(true);
      }
    });

    effect(() => {
      const attachment = this.store.pendingScheduledAttachment();
      if (attachment) {
        this.attachment.set(attachment);
        this.store.pendingScheduledAttachment.set(null);
        this.showScheduleModal.set(true);
      }
    });
  }

  openScheduleModal() {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal() {
    this.showScheduleModal.set(false);
  }

  scheduleMessage() {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    const value = this.scheduleForm.getRawValue();
    this.store.scheduleMessage({ ...value, attachment: this.attachment() });
    this.closeScheduleModal();
    this.scheduleForm.patchValue({
      content: '',
      scheduledAt: this.toDatetimeLocal(this.addHours(new Date(), 1)),
      frequency: 'once',
    });
    this.attachment.set(null);
  }

  editScheduled(message: ScheduledMessageItem) {
    this.scheduleForm.setValue({
      recipient: message.recipient,
      content: message.content,
      scheduledAt: message.scheduledAt,
      frequency: message.frequency,
    });
    this.attachment.set(message.attachment ?? null);
    this.store.cancelScheduled(message.id, false);
    this.openScheduleModal();
  }

  cancelScheduled(id: number) {
    this.store.cancelScheduled(id);
  }

  insertVariable(control: FormControl<string>, variable: string) {
    const value = control.value;
    control.setValue(`${value}${value ? ' ' : ''}{{${variable}}}`);
  }

  excerpt(value: string, max = 76): string {
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  scheduledStatusLabel(status: ScheduledMessageItem['status']): string {
    return { pending: 'Pendiente', sent: 'Enviado', failed: 'Fallido' }[status];
  }

  scheduledStatusClass(status: ScheduledMessageItem['status']): string {
    return { pending: 'table-pill--warning', sent: 'table-pill--success', failed: 'table-pill--danger' }[status];
  }

  frequencyLabel(frequency: Frequency): string {
    return { once: 'Envío único', daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' }[frequency];
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    this.uploadingAttachment.set(true);
    this.store
      .uploadMedia(file)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => this.uploadingAttachment.set(false)),
      )
      .subscribe((attachment) => {
        if (attachment) this.attachment.set(attachment);
      });
  }

  removeAttachment() {
    this.attachment.set(null);
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private toDatetimeLocal(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }
}
