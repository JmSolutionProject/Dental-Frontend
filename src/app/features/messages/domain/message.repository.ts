import { Observable } from 'rxjs';

import {
  CreateMessageRequest,
  FindMessagesParams,
  Message,
  PaginatedMessagesResponse,
  UpdateMessageRequest,
} from './messages';

export abstract class MessageRepository {
  abstract findAll(params?: FindMessagesParams): Observable<PaginatedMessagesResponse>;
  abstract findById(id: string): Observable<Message>;
  abstract create(data: CreateMessageRequest): Observable<Message>;
  abstract update(id: string, data: UpdateMessageRequest): Observable<Message>;
  abstract delete(id: string): Observable<Message>;
}
