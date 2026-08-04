import { Observable } from 'rxjs';

import {
  CreateWhatsAppBroadcastCampaignRequest,
  CreateMessageRequest,
  FindMessagesParams,
  Message,
  PaginatedMessagesResponse,
  SendWhatsAppMessageRequest,
  SendWhatsAppMessageResponse,
  UpdateMessageRequest,
  WhatsAppPairingCodeResponse,
  WhatsAppQrResponse,
  WhatsAppBroadcastCampaign,
  WhatsAppMediaAttachment,
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
  abstract requestWhatsAppPairingCode(
    phone: string,
  ): Observable<WhatsAppPairingCodeResponse>;
  abstract sendWhatsAppMessage(
    patientId: string,
    data: SendWhatsAppMessageRequest,
  ): Observable<SendWhatsAppMessageResponse>;
  abstract sendWhatsAppDirect(
    phone: string,
    data: SendWhatsAppMessageRequest,
  ): Observable<SendWhatsAppMessageResponse>;
  abstract createWhatsAppBroadcastCampaign(
    data: CreateWhatsAppBroadcastCampaignRequest,
  ): Observable<WhatsAppBroadcastCampaign>;
  abstract getWhatsAppBroadcastCampaign(id: string): Observable<WhatsAppBroadcastCampaign>;
  abstract startWhatsAppBroadcastCampaign(id: string): Observable<WhatsAppBroadcastCampaign>;
  abstract pauseWhatsAppBroadcastCampaign(id: string): Observable<WhatsAppBroadcastCampaign>;
  abstract cancelWhatsAppBroadcastCampaign(id: string): Observable<WhatsAppBroadcastCampaign>;
  abstract uploadWhatsAppMedia(file: File): Observable<WhatsAppMediaAttachment>;
}
