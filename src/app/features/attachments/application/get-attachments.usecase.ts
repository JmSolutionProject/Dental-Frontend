import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Attachment } from '../domain/attachment';
import { AttachmentRepository } from '../domain/attachment.repository';

@Injectable({ providedIn: 'root' })
export class GetAttachmentsUseCase {
  private readonly repo = inject(AttachmentRepository);

  execute(patientId: string): Observable<Attachment[]> {
    return this.repo.findByPatientId(patientId);
  }
}
