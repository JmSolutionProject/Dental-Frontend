import { Observable } from 'rxjs';

import { Attachment } from './attachment';

export abstract class AttachmentRepository {
  /** Upload a file for a patient. Uses multipart/form-data via the API. */
  abstract upload(
    patientId: string,
    file: File,
    description?: string,
    servicioId?: string,
  ): Observable<Attachment>;

  /** List all attachments for a patient. */
  abstract findByPatientId(patientId: string): Observable<Attachment[]>;

  /** Fetch a single attachment by ID. */
  abstract findById(id: string): Observable<Attachment>;

  /** Permanently delete an attachment. */
  abstract delete(id: string): Observable<void>;
}
