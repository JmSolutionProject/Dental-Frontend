import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take, catchError, of, finalize } from 'rxjs';

import { GetAttachmentsUseCase } from '../../application/get-attachments.usecase';
import { DeleteAttachmentUseCase } from '../../application/delete-attachment.usecase';
import {
  Attachment,
  isImage,
  isPdf,
  attachmentCategoryLabel,
} from '../../domain/attachment';
import { UploadDropzone } from '../upload-dropzone/upload-dropzone';
import { AttachmentPreviewModal } from '../preview-modal/preview-modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-attachment-list',
  imports: [UploadDropzone, AttachmentPreviewModal],
  templateUrl: './attachment-list.html',
  styleUrl: './attachment-list.css',
})
export class AttachmentList {
  private readonly route = inject(ActivatedRoute);
  private readonly getAttachments = inject(GetAttachmentsUseCase);
  private readonly deleteAttachment = inject(DeleteAttachmentUseCase);
  private readonly toast = inject(ToastService);

  readonly patientId = signal('');
  readonly attachments = signal<Attachment[]>([]);
  readonly loading = signal(true);
  readonly previewAttachment = signal<Attachment | null>(null);
  readonly showPreview = signal(false);
  readonly deleting = signal(false);

  constructor() {
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.patientId.set(id);
        this.loadAttachments();
      } else {
        this.loading.set(false);
      }
    });
  }

  private loadAttachments() {
    this.loading.set(true);
    this.getAttachments
      .execute(this.patientId())
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((list) => this.attachments.set(list));
  }

  openPreview(attachment: Attachment) {
    this.previewAttachment.set(attachment);
    this.showPreview.set(true);
  }

  closePreview() {
    this.showPreview.set(false);
    this.previewAttachment.set(null);
  }

  delete(attachment: Attachment) {
    if (this.deleting()) return;

    this.deleting.set(true);
    this.deleteAttachment
      .execute(attachment.id)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe((result) => {
        if (result !== null) {
          this.toast.success(`"${attachment.fileName}" deleted.`);
          this.loadAttachments();
        }
      });
  }

  onUploaded() {
    this.loadAttachments();
  }

  // Template helpers
  isImage = isImage;
  isPdf = isPdf;
  categoryLabel = attachmentCategoryLabel;
}
