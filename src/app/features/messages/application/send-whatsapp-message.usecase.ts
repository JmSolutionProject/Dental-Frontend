import { inject, Injectable } from '@angular/core';

import { MessageRepository } from '../domain/message.repository';
import { SendWhatsAppMessageRequest } from '../domain/messages';

@Injectable({ providedIn: 'root' })
export class SendWhatsAppMessageUseCase {
  private readonly repository = inject(MessageRepository);

  execute(patientId: string, request: SendWhatsAppMessageRequest) {
    return this.repository.sendWhatsAppMessage(patientId, request);
  }
}
