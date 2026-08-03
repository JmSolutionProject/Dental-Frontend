import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';

import { Modal } from '../../../../shared/components/modal/modal';
import { WhatsAppMediaAttachment } from '../../domain/messages';
import { MessageCenterStore, MessageTemplateItem } from '../messages-center.store';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-templates-panel',
  imports: [Modal, ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ heroPlus })],
  templateUrl: './templates-panel.html',
  styleUrl: './templates-panel.css',
})
export class TemplatesPanel {
  readonly store = inject(MessageCenterStore);
  readonly showTemplateModal = signal(false);
  readonly attachment = signal<WhatsAppMediaAttachment | null>(null);
  readonly uploadingAttachment = signal(false);

  readonly templateForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('Bienvenida', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly templateCharacterCount = computed(() => this.templateForm.controls.content.value.length);

  openTemplateModal() {
    this.templateForm.reset({ name: '', category: 'Bienvenida', content: '' });
    this.attachment.set(null);
    this.showTemplateModal.set(true);
  }

  closeTemplateModal() {
    this.showTemplateModal.set(false);
  }

  saveTemplate() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }
    this.store.saveTemplate({
      ...this.templateForm.getRawValue(),
      attachment: this.attachment(),
    });
    this.templateForm.reset({ name: '', category: 'Bienvenida', content: '' });
    this.attachment.set(null);
    this.closeTemplateModal();
  }

  useTemplate(template: MessageTemplateItem, target: 'direct' | 'scheduled' = 'direct') {
    this.store.useTemplate(template, target);
  }

  insertVariable(control: FormControl<string>, variable: string) {
    const value = control.value;
    control.setValue(`${value}${value ? ' ' : ''}{{${variable}}}`);
  }

  excerpt(value: string, max = 76): string {
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || !file.type.startsWith('image/')) return;

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
}
