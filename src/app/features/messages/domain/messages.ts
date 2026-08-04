export interface Message {
  id: string;
  patientId?: string;
  patientName?: string;
  subject: string;
  body: string;
  channel: MessageChannel;
  status: MessageStatus;
  createdAt: string;
}

export type MessageChannel = 'email' | 'sms' | 'whatsapp';
export type MessageStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export interface PaginatedMessagesResponse {
  data: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface FindMessagesParams {
  page?: number;
  limit?: number;
}

export interface CreateMessageRequest {
  templateId: string;
  patientId: string;
  appointmentId?: string;
  statusId: string;
  scheduledAt: string;
  sentAt?: string;
  error?: string;
}

export type UpdateMessageRequest = Partial<CreateMessageRequest>;

export interface WhatsAppStatus {
  status: string;
  ready: boolean;
  message?: string;
}

export interface WhatsAppQrResponse {
  qr: string | null;
}

export interface WhatsAppPairingCodeResponse {
  code: string;
  status: string;
}

export interface SendWhatsAppMessageRequest {
  content: string;
  mediaKey?: string;
  mediaName?: string;
  mediaMimeType?: string;
}

export interface SendWhatsAppMessageResponse {
  success: boolean;
  message?: string;
}

export interface CreateWhatsAppBroadcastCampaignRequest {
  nombreCampana: string;
  descripcion?: string;
  pacienteIds: number[];
  contenido: string;
  mediaKey?: string;
  mediaName?: string;
  mediaMimeType?: string;
  tipoEnvio?: 'custom-message';
  maxIntentos?: number;
}

export interface WhatsAppMediaAttachment {
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface WhatsAppBroadcastRecipient {
  id: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  sentAt: string | null;
  error: string | null;
  whatsappMessageId: string | null;
  mediaKey?: string | null;
  mediaName?: string | null;
  mediaMimeType?: string | null;
}

export interface WhatsAppBroadcastCampaign {
  id: string;
  name: string;
  description: string | null;
  processStatus: 'pending' | 'running' | 'paused' | 'cancelled' | 'completed' | string;
  senderType: string;
  createdAt: string;
  startedAt: string | null;
  pausedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  totals: Record<string, number>;
  recipients: WhatsAppBroadcastRecipient[];
}
