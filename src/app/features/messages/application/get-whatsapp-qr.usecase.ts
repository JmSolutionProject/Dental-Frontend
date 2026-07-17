import { inject, Injectable } from '@angular/core';

import { MessageRepository } from '../domain/message.repository';

@Injectable({ providedIn: 'root' })
export class GetWhatsAppQrUseCase {
  private readonly repository = inject(MessageRepository);

  execute() {
    return this.repository.getWhatsAppQr();
  }
}
