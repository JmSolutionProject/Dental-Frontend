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

export interface SendWhatsAppMessageRequest {
  content: string;
}

export interface SendWhatsAppMessageResponse {
  success: boolean;
  message?: string;
}
