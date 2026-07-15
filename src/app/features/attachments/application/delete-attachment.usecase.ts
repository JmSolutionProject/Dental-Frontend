import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AttachmentRepository } from '../domain/attachment.repository';

@Injectable({ providedIn: 'root' })
export class DeleteAttachmentUseCase {
  private readonly repo = inject(AttachmentRepository);

  execute(id: string): Observable<void> {
    return this.repo.delete(id);
  }
}
