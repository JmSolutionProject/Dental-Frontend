import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Attachment } from '../domain/attachment';
import { AttachmentRepository } from '../domain/attachment.repository';

@Injectable({ providedIn: 'root' })
export class AttachmentApiRepository implements AttachmentRepository {
  private readonly storage = new Map<string, Attachment[]>();

  upload(
    patientId: string,
    file: File,
    description?: string,
  ): Observable<Attachment> {
    const list = this.storage.get(patientId) ?? [];

    // Create browser object URL for instant previewing
    const objectUrl = URL.createObjectURL(file);

    const newAttachment: Attachment = {
      id: String(Date.now()),
      patientId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url: objectUrl,
      description: description || file.name,
      createdAt: new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newAttachment);
    this.storage.set(patientId, list);

    return of(newAttachment);
  }

  findByPatientId(patientId: string): Observable<Attachment[]> {
    const list = this.storage.get(patientId) ?? [];
    return of(list);
  }

  findById(id: string): Observable<Attachment> {
    for (const list of this.storage.values()) {
      const found = list.find((a) => a.id === id);
      if (found) return of(found);
    }
    return of({
      id,
      patientId: '1',
      fileName: 'Archivo',
      mimeType: 'application/pdf',
      size: 1024,
      url: '#',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  delete(id: string): Observable<void> {
    for (const [patientId, list] of this.storage.entries()) {
      const filtered = list.filter((a) => a.id !== id);
      if (filtered.length !== list.length) {
        this.storage.set(patientId, filtered);
        break;
      }
    }
    return of(undefined);
  }
}
