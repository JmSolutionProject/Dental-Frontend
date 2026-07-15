import { inject, Injectable } from '@angular/core';

import { MessageRepository } from '../domain/message.repository';
import { FindMessagesParams } from '../domain/messages';

@Injectable({ providedIn: 'root' })
export class GetMessagesUseCase {
  private readonly repository = inject(MessageRepository);

  execute(params?: FindMessagesParams) {
    return this.repository.findAll(params);
  }
}
