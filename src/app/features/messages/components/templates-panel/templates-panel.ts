import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Modal } from '../../../../shared/components/modal/modal';
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

  readonly templateForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('Bienvenida', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly templateCharacterCount = computed(() => this.templateForm.controls.content.value.length);

  openTemplateModal() {
    this.templateForm.reset({ name: '', category: 'Bienvenida', content: '' });
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
    this.store.saveTemplate(this.templateForm.getRawValue());
    this.templateForm.reset({ name: '', category: 'Bienvenida', content: '' });
    this.closeTemplateModal();
  }

  useTemplate(template: MessageTemplateItem, target: 'direct' | 'scheduled' = 'direct') {
    this.store.useTemplate(template.content, target);
  }

  insertVariable(control: FormControl<string>, variable: string) {
    const value = control.value;
    control.setValue(`${value}${value ? ' ' : ''}{{${variable}}}`);
  }

  excerpt(value: string, max = 76): string {
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }
}
