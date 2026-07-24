import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Modal } from '../../../../shared/components/modal/modal';
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { Frequency, MessageCenterStore, ScheduledMessageItem } from '../messages-center.store';

@Component({
  selector: 'app-scheduled-messages-panel',
  imports: [Modal, ReactiveFormsModule, Table, TableCell],
  templateUrl: './scheduled-messages-panel.html',
  styleUrl: './scheduled-messages-panel.css',
})
export class ScheduledMessagesPanel {
  readonly store = inject(MessageCenterStore);
  readonly showScheduleModal = signal(false);

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
    this.store.scheduleMessage(value);
    this.closeScheduleModal();
    this.scheduleForm.patchValue({
      content: '',
      scheduledAt: this.toDatetimeLocal(this.addHours(new Date(), 1)),
      frequency: 'once',
    });
  }

  editScheduled(message: ScheduledMessageItem) {
    this.scheduleForm.setValue({
      recipient: message.recipient,
      content: message.content,
      scheduledAt: message.scheduledAt,
      frequency: message.frequency,
    });
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

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private toDatetimeLocal(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }
}
