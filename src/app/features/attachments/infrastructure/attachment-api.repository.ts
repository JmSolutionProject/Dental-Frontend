import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import { Attachment } from '../domain/attachment';
import { AttachmentRepository } from '../domain/attachment.repository';

@Injectable({ providedIn: 'root' })
export class AttachmentApiRepository implements AttachmentRepository {
  upload(
    patientId: string,
    file: File,
    description?: string,
  ): Observable<Attachment> {
    void patientId;
    void file;
    void description;
    return throwError(() => new Error('Attachment upload endpoint is not available in the backend yet.'));
  }

  findByPatientId(patientId: string): Observable<Attachment[]> {
    void patientId;
    return of([]);
  }

  findById(id: string): Observable<Attachment> {
    void id;
    return throwError(() => new Error('Attachment detail endpoint is not available in the backend yet.'));
  }

  delete(id: string): Observable<void> {
    void id;
    return throwError(() => new Error('Attachment delete endpoint is not available in the backend yet.'));
  }
}
