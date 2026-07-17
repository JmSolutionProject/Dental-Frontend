import { Observable } from 'rxjs';

import {
  CreateMessageRequest,
  FindMessagesParams,
  Message,
  PaginatedMessagesResponse,
  SendWhatsAppMessageRequest,
  SendWhatsAppMessageResponse,
  UpdateMessageRequest,
  WhatsAppQrResponse,
  WhatsAppStatus,
} from './messages';

export abstract class MessageRepository {
  abstract findAll(params?: FindMessagesParams): Observable<PaginatedMessagesResponse>;
  abstract findById(id: string): Observable<Message>;
  abstract create(data: CreateMessageRequest): Observable<Message>;
  abstract update(id: string, data: UpdateMessageRequest): Observable<Message>;
  abstract delete(id: string): Observable<Message>;
  abstract getWhatsAppStatus(): Observable<WhatsAppStatus>;
  abstract getWhatsAppQr(): Observable<WhatsAppQrResponse>;
  abstract sendWhatsAppMessage(
    patientId: string,
    data: SendWhatsAppMessageRequest,
  ): Observable<SendWhatsAppMessageResponse>;
}
