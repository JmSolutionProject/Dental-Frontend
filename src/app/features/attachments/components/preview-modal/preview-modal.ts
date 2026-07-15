import { Component, input, output } from '@angular/core';

import { Attachment, isImage, isPdf } from '../../domain/attachment';
import { Modal } from '../../../../shared/components/modal/modal';

@Component({
  selector: 'app-attachment-preview-modal',
  imports: [Modal],
  templateUrl: './preview-modal.html',
  styleUrl: './preview-modal.css',
})
export class AttachmentPreviewModal {
  readonly attachment = input.required<Attachment>();
  readonly visible = input(false);

  readonly close = output<void>();

  get isImage(): boolean {
    return isImage(this.attachment().mimeType);
  }

  get isPdf(): boolean {
    return isPdf(this.attachment().mimeType);
  }
}
