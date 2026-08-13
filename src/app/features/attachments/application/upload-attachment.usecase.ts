import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Attachment } from '../domain/attachment';
import { AttachmentRepository } from '../domain/attachment.repository';

@Injectable({ providedIn: 'root' })
export class UploadAttachmentUseCase {
  private readonly repo = inject(AttachmentRepository);

  execute(
    patientId: string,
    file: File,
    description?: string,
    servicioId?: string,
  ): Observable<Attachment> {
    return this.repo.upload(patientId, file, description, servicioId);
  }
}
