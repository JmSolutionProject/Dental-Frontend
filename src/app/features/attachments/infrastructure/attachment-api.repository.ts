import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { Attachment } from '../domain/attachment';
import { AttachmentRepository } from '../domain/attachment.repository';

interface BackendAttachment {
  id: string;
  patientId: string;
  servicioId: string | null;
  servicioName: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  r2Key: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentApiRepository implements AttachmentRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  upload(
    patientId: string,
    file: File,
    description?: string,
    servicioId?: string,
  ): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    if (description) {
      formData.append('description', description);
    }
    if (servicioId) {
      formData.append('servicioId', servicioId);
    }

    return this.http
      .post<BackendAttachment>(`${this.apiUrl}/files/upload`, formData)
      .pipe(switchMap((attachment) => this.resolveAttachment(attachment)));
  }

  findByPatientId(patientId: string): Observable<Attachment[]> {
    return this.http
      .get<BackendAttachment[]>(`${this.apiUrl}/files/patient/${patientId}`)
      .pipe(
        switchMap((list) =>
          list.length === 0
            ? of([])
            : forkJoin(list.map((attachment) => this.resolveAttachment(attachment))),
        ),
      );
  }

  findById(id: string): Observable<Attachment> {
    return of(this.emptyAttachment(id));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/files/${id}`);
  }

  private resolveAttachment(attachment: BackendAttachment): Observable<Attachment> {
    const domain = this.toDomain(attachment);

    return this.http
      .get(`${this.apiUrl}/files/image?key=${encodeURIComponent(attachment.r2Key)}`, {
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          return { ...domain, url, thumbnailUrl: url };
        }),
        catchError(() => of(domain)),
      );
  }

  private toDomain(attachment: BackendAttachment): Attachment {
    return {
      id: attachment.id,
      patientId: attachment.patientId,
      servicioId: attachment.servicioId ?? undefined,
      servicioName: attachment.servicioName ?? undefined,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      description: attachment.description ?? undefined,
      createdAt: this.formatDate(attachment.createdAt),
      updatedAt: attachment.createdAt,
      url: attachment.url,
    };
  }

  private formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private emptyAttachment(id: string): Attachment {
    return {
      id,
      patientId: '',
      fileName: '',
      mimeType: 'application/octet-stream',
      size: 0,
      url: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
