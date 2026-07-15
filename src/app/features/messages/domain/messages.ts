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
export type MessageStatus = 'draft' | 'sent' | 'failed';
