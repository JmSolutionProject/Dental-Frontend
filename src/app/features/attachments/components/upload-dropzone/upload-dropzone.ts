import {
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { take, catchError, of, finalize } from 'rxjs';

import { UploadAttachmentUseCase } from '../../application/upload-attachment.usecase';
import { validateAttachment } from '../../domain/attachment';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-upload-dropzone',
  imports: [],
  templateUrl: './upload-dropzone.html',
  styleUrl: './upload-dropzone.css',
})
export class UploadDropzone {
  private readonly uploadUseCase = inject(UploadAttachmentUseCase);
  private readonly toast = inject(ToastService);

  /** The patient to associate uploaded files with. */
  readonly patientId = input.required<string>();

  /** Emitted when an upload completes successfully. */
  readonly uploaded = output<void>();

  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly description = signal('');

  // ---- Drag-and-drop handlers -----------------------------------------------

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
    // Reset so the same file can be re-selected
    input.value = '';
  }

  // ---- File validation ------------------------------------------------------

  private handleFileSelection(file: File) {
    const result = validateAttachment(file);
    if (!result.valid) {
      this.toast.error(result.message ?? 'Invalid file.');
      return;
    }
    this.selectedFile.set(file);
    this.description.set('');
  }

  clearSelection() {
    this.selectedFile.set(null);
    this.description.set('');
  }

  // ---- Upload ---------------------------------------------------------------

  upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);

    this.uploadUseCase
      .execute(
        this.patientId(),
        file,
        this.description() || undefined,
      )
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to upload attachment.');
          return of(null);
        }),
        finalize(() => this.uploading.set(false)),
      )
      .subscribe((attachment) => {
        if (attachment) {
          this.toast.success(`"${file.name}" uploaded successfully.`);
          this.clearSelection();
          this.uploaded.emit();
        }
      });
  }
}
