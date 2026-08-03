import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Patient } from '../../../patients/domain/patient';
import { WhatsAppMediaAttachment } from '../../domain/messages';
import { MessageCenterStore, ScheduledRecipient } from '../messages-center.store';

type SendMode = 'now' | 'scheduled';

@Component({
  selector: 'app-direct-message-form',
  imports: [FormField, ReactiveFormsModule],
  templateUrl: './direct-message-form.html',
  styleUrl: './direct-message-form.css',
})
export class DirectMessageForm {
  readonly store = inject(MessageCenterStore);
  private readonly toast = inject(ToastService);

  readonly contactSearch = signal('');
  readonly attachment = signal<WhatsAppMediaAttachment | null>(null);
  readonly uploadingAttachment = signal(false);

  readonly sendForm = new FormGroup({
    countryCode: new FormControl('+51', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    patientIds: new FormControl<string[]>([], { nonNullable: true }),
    service: new FormControl('', { nonNullable: true }),
    templateId: new FormControl('', { nonNullable: true }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    mode: new FormControl<SendMode>('now', { nonNullable: true }),
    intervalSeconds: new FormControl(40, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(40), Validators.max(180)],
    }),
  });

  readonly directCharacterCount = computed(() => this.sendForm.controls.content.value.length);

  readonly filteredPatients = computed(() => {
    const search = this.contactSearch().trim().toLowerCase();
    const selectedIds = new Set(this.sendForm.controls.patientIds.value);
    const patients = this.store.patients().filter((patient) => !selectedIds.has(patient.id));

    if (!search) return [];

    return patients
      .filter((patient) => {
        const value = [this.store.patientName(patient), patient.phone, patient.documentNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return value.includes(search);
      })
      .slice(0, 12);
  });

  constructor() {
    // reacciona cuando templates-panel pide usar una plantilla acá
    effect(() => {
      const content = this.store.pendingDirectContent();
      if (content !== null) {
        this.sendForm.controls.content.setValue(content);
        this.store.pendingDirectContent.set(null);
      }
    });

    effect(() => {
      const attachment = this.store.pendingDirectAttachment();
      if (attachment) {
        this.attachment.set(attachment);
        this.store.pendingDirectAttachment.set(null);
      }
    });
  }

  submit() {
    if (this.sendForm.invalid || this.store.sending()) {
      this.sendForm.markAllAsTouched();
      return;
    }

    const value = this.sendForm.getRawValue();
    const content = value.content.trim();
    const patients = this.selectedPatients();

    if (patients.length === 0 && !this.normalizedManualPhone()) {
      this.toast.info('Seleccioná un contacto o escribí un número de WhatsApp.');
      return;
    }

    const recipients: ScheduledRecipient[] = patients.map((patient) => ({
      patient,
      content: this.store.renderTemplate(patient, content, value.service),
      attachment: this.attachment(),
    }));

    const resetForm = () => {
      this.sendForm.controls.templateId.reset();
      this.sendForm.controls.content.reset();
      this.attachment.set(null);
    };

    if (patients.length === 0) {
      this.store.sendImmediateToPhone(this.normalizedManualPhone()!, content, resetForm, this.attachment());
      return;
    }

    if (patients.length > 1) {
      this.store.createBroadcastCampaignForPatients(patients, content, resetForm, this.attachment());
      return;
    }

    if (value.mode === 'scheduled') {
      this.store.startScheduledSend(recipients, value.intervalSeconds);
      return;
    }

    this.store.sendImmediate(recipients, resetForm);
  }

  broadcastTotal(status: string): number {
    return this.store.currentBroadcast()?.totals[status] ?? 0;
  }

  broadcastTotalCount(): number {
    return this.store.currentBroadcast()?.recipients.length ?? 0;
  }

  onContactSearchInput(event: Event) {
    this.contactSearch.set((event.target as HTMLInputElement).value);
  }

  selectPatient(patient: Patient) {
    const current = this.sendForm.controls.patientIds.value;
    if (!current.includes(patient.id)) {
      this.sendForm.controls.patientIds.setValue([...current, patient.id]);
    }
    this.contactSearch.set('');
    if (patient.phone) this.sendForm.controls.phone.setValue(patient.phone);
  }

  removeSelectedPatient(patientId: string) {
    this.sendForm.controls.patientIds.setValue(
      this.sendForm.controls.patientIds.value.filter((id) => id !== patientId),
    );
  }

  selectAllPatients() {
    this.sendForm.controls.patientIds.setValue(this.store.patients().map((patient) => patient.id));
  }

  clearPatientSelection() {
    this.sendForm.controls.patientIds.setValue([]);
  }

  applySelectedTemplate() {
    const templateId = Number(this.sendForm.controls.templateId.value);
    const template = this.store.templates().find((item) => item.id === templateId);

    if (!template) return;

    this.sendForm.controls.content.setValue(template.content);
    this.attachment.set(template.attachment ?? null);
  }

  selectedPatients(): Patient[] {
    const ids = new Set(this.sendForm.controls.patientIds.value);
    return this.store.patients().filter((patient) => ids.has(patient.id));
  }

  normalizedManualPhone(): string | null {
    const countryCode = this.sendForm.controls.countryCode.value.replace(/\D/g, '');
    const phone = this.sendForm.controls.phone.value.replace(/\D/g, '');
    if (!phone) return null;
    if (phone.startsWith(countryCode)) return `+${phone}`;
    return `+${countryCode}${phone}`;
  }

  messagePreview(): string {
    const patient = this.selectedPatients()[0] ?? this.store.patients()[0];
    const template = this.sendForm.controls.content.value;
    return patient ? this.store.renderTemplate(patient, template, this.sendForm.controls.service.value) : template;
  }

  templateHelp(): string {
    return '{{nombre}}, {{apellido}}, {{telefono}}, {{documento}}, {{servicio}}, {{fecha}}';
  }

  insertVariable(control: FormControl<string>, variable: string) {
    const value = control.value;
    control.setValue(`${value}${value ? ' ' : ''}{{${variable}}}`);
  }

  addAttachment(type: string) {
    this.toast.info(`${type} listo para adjuntar cuando el backend habilite archivos.`);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.info('Seleccioná una imagen válida.');
      return;
    }

    this.uploadingAttachment.set(true);
    this.store
      .uploadMedia(file)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo subir la imagen.');
          return of(null);
        }),
        finalize(() => this.uploadingAttachment.set(false)),
      )
      .subscribe((attachment) => {
        if (!attachment) return;
        this.attachment.set(attachment);
        this.toast.success('Imagen adjuntada al mensaje.');
      });
  }

  removeAttachment() {
    this.attachment.set(null);
  }

  patientName(patient: Patient): string {
    return this.store.patientName(patient);
  }
}
