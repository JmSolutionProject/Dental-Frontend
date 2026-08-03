import { inject, Injectable } from '@angular/core';

import { MessageRepository } from '../domain/message.repository';
import { CreateWhatsAppBroadcastCampaignRequest } from '../domain/messages';

@Injectable({ providedIn: 'root' })
export class ManageWhatsAppBroadcastUseCase {
  private readonly repository = inject(MessageRepository);

  create(request: CreateWhatsAppBroadcastCampaignRequest) {
    return this.repository.createWhatsAppBroadcastCampaign(request);
  }

  findById(id: string) {
    return this.repository.getWhatsAppBroadcastCampaign(id);
  }

  start(id: string) {
    return this.repository.startWhatsAppBroadcastCampaign(id);
  }

  pause(id: string) {
    return this.repository.pauseWhatsAppBroadcastCampaign(id);
  }

  cancel(id: string) {
    return this.repository.cancelWhatsAppBroadcastCampaign(id);
  }

  uploadMedia(file: File) {
    return this.repository.uploadWhatsAppMedia(file);
  }
}
