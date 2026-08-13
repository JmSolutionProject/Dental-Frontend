import { Component, effect, inject, input, signal } from '@angular/core';
import { Attachment } from '../../../attachments/domain/attachment';
import { GetAttachmentsUseCase } from '../../../attachments/application/get-attachments.usecase';
import { UploadAttachmentUseCase } from '../../../attachments/application/upload-attachment.usecase';
import { validateAttachment } from '../../../attachments/domain/attachment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { catchError, finalize, of, take } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { GetCatalogUseCase } from '../../../catalog/application/get-catalog.usecase';
import { CatalogService } from '../../../catalog/domain/catalog';

@Component({
  selector: 'app-patient-attachments-tab',
  standalone: true,
  imports: [Modal],
  templateUrl: './patient-attachments-tab.html',
  styleUrl: './patient-attachments-tab.css'
})
export class PatientAttachmentsTab {
  patientId = input.required<string>();

  private readonly getAttachments = inject(GetAttachmentsUseCase);
  private readonly uploadAttachment = inject(UploadAttachmentUseCase);
  private readonly getCatalog = inject(GetCatalogUseCase);
  private readonly toast = inject(ToastService);

  readonly attachments = signal<Attachment[]>([]);
  readonly loadingAttachments = signal(false);
  readonly uploadingFile = signal(false);
  readonly isDraggingFile = signal(false);
  readonly previewAttachment = signal<Attachment | null>(null);

  readonly pendingFile = signal<File | null>(null);
  readonly description = signal('');
  readonly servicioId = signal('');
  readonly servicios = signal<CatalogService[]>([]);

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) {
        this.loadPatientAttachments(id);
      }
    });

    this.getCatalog
      .execute()
      .pipe(take(1), catchError(() => of([])))
      .subscribe((services) => this.servicios.set(services));
  }

  private loadPatientAttachments(id: string) {
    this.loadingAttachments.set(true);
    this.getAttachments
      .execute(id)
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loadingAttachments.set(false)),
      )
      .subscribe((list) => {
        this.attachments.set(list);
      });
  }

  private selectFile(file: File) {
    const result = validateAttachment(file);
    if (!result.valid) {
      this.toast.error(result.message ?? 'Archivo inválido.');
      return;
    }
    this.pendingFile.set(file);
    this.description.set('');
    this.servicioId.set('');
  }

  uploadPending() {
    const pId = this.patientId();
    const file = this.pendingFile();
    if (!pId || !file) return;

    this.uploadingFile.set(true);

    this.uploadAttachment
      .execute(
        pId,
        file,
        this.description() || undefined,
        this.servicioId() || undefined,
      )
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al subir el archivo adjunto.');
          return of(null);
        }),
        finalize(() => this.uploadingFile.set(false)),
      )
      .subscribe((newAtt) => {
        if (newAtt) {
          this.toast.success('¡Archivo o imagen adjuntado exitosamente!');
          this.pendingFile.set(null);
          this.loadPatientAttachments(pId);
        }
      });
  }

  cancelPending() {
    this.pendingFile.set(null);
    this.description.set('');
    this.servicioId.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectFile(input.files[0]);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectFile(event.dataTransfer.files[0]);
    }
  }

  isImageFile(mimeType: string): boolean {
    return (
      mimeType.startsWith('image/') ||
      mimeType.includes('png') ||
      mimeType.includes('jpeg') ||
      mimeType.includes('jpg') ||
      mimeType.includes('webp')
    );
  }

  openAttachmentPreview(att: Attachment) {
    this.previewAttachment.set(att);
  }

  closeAttachmentPreview() {
    this.previewAttachment.set(null);
  }
}
