import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { MessageRepository } from '../domain/message.repository';
import {
  CreateMessageRequest,
  FindMessagesParams,
  Message,
  MessageChannel,
  MessageStatus,
  PaginatedMessagesResponse,
  UpdateMessageRequest,
} from '../domain/messages';

interface BackendMessage {
  id: string;
  templateId: string;
  templateName: string;
  messageType: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  statusId: string;
  status: string;
  content: string;
  scheduledAt: string;
  sentAt: string | null;
  error: string | null;
}

interface BackendPaginatedMessagesResponse {
  data: BackendMessage[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class MessageApiRepository implements MessageRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindMessagesParams): Observable<PaginatedMessagesResponse> {
    const httpParams = new HttpParams()
      .set('page', String(params?.page ?? 1))
      .set('limit', String(params?.limit ?? 10));

    return this.http
      .get<BackendPaginatedMessagesResponse>(`${this.apiUrl}/messages`, {
        params: httpParams,
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data.map((message) => this.fromBackend(message)),
        })),
      );
  }

  findById(id: string): Observable<Message> {
    return this.http
      .get<BackendMessage>(`${this.apiUrl}/messages/${id}`)
      .pipe(map((message) => this.fromBackend(message)));
  }

  create(data: CreateMessageRequest): Observable<Message> {
    return this.http
      .post<BackendMessage>(`${this.apiUrl}/messages`, this.toBackend(data))
      .pipe(map((message) => this.fromBackend(message)));
  }

  update(id: string, data: UpdateMessageRequest): Observable<Message> {
    return this.http
      .put<BackendMessage>(`${this.apiUrl}/messages/${id}`, this.toBackend(data))
      .pipe(map((message) => this.fromBackend(message)));
  }

  delete(id: string): Observable<Message> {
    return this.http
      .delete<BackendMessage>(`${this.apiUrl}/messages/${id}`)
      .pipe(map((message) => this.fromBackend(message)));
  }

  private fromBackend(message: BackendMessage): Message {
    return {
      id: message.id,
      patientId: message.patientId,
      patientName: message.patientName,
      subject: message.templateName,
      body: message.content,
      channel: this.toChannel(message.messageType),
      status: this.toStatus(message.status),
      createdAt: message.scheduledAt,
    };
  }

  private toBackend(data: CreateMessageRequest | UpdateMessageRequest) {
    return {
      plantillaId: data.templateId ? Number(data.templateId) : undefined,
      pacienteId: data.patientId ? Number(data.patientId) : undefined,
      citaId: data.appointmentId ? Number(data.appointmentId) : undefined,
      estadoEnvioId: data.statusId ? Number(data.statusId) : undefined,
      fechaHoraProgramada: data.scheduledAt,
      fechaHoraEnvio: data.sentAt,
      errorDetalle: data.error,
    };
  }

  private toChannel(value: string): MessageChannel {
    if (value === 'email' || value === 'sms' || value === 'whatsapp') {
      return value;
    }
    return 'whatsapp';
  }

  private toStatus(value: string): MessageStatus {
    if (value === 'draft' || value === 'scheduled' || value === 'sent' || value === 'failed') {
      return value;
    }
    return 'scheduled';
  }
}
