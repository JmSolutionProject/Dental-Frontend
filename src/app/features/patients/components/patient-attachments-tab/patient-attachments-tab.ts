import { Component, effect, inject, input, signal } from '@angular/core';
import { Attachment } from '../../../attachments/domain/attachment';
import { GetAttachmentsUseCase } from '../../../attachments/application/get-attachments.usecase';
import { UploadAttachmentUseCase } from '../../../attachments/application/upload-attachment.usecase';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { catchError, finalize, of, take } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';

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
  private readonly toast = inject(ToastService);

  readonly attachments = signal<Attachment[]>([]);
  readonly loadingAttachments = signal(false);
  readonly uploadingFile = signal(false);
  readonly isDraggingFile = signal(false);
  readonly previewAttachment = signal<Attachment | null>(null);

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) {
        this.loadPatientAttachments(id);
      }
    });
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

  uploadFile(file: File) {
    const pId = this.patientId();
    if (!pId) return;

    this.uploadingFile.set(true);

    this.uploadAttachment
      .execute(pId, file, file.name)
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
          this.loadPatientAttachments(pId);
        }
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.uploadFile(input.files[0]);
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
      this.uploadFile(event.dataTransfer.files[0]);
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
