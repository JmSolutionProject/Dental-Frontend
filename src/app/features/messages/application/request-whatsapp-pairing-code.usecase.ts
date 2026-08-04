import { inject, Injectable } from '@angular/core';

import { MessageRepository } from '../domain/message.repository';

@Injectable({ providedIn: 'root' })
export class RequestWhatsAppPairingCodeUseCase {
  private readonly repository = inject(MessageRepository);

  execute(phone: string) {
    return this.repository.requestWhatsAppPairingCode(phone);
  }
}
