import { Component, effect, inject, signal } from '@angular/core';
import { MessagesStatusBar } from '../messages-status-bar/messages-status-bar';
import { DirectMessageForm } from '../direct-message-form/direct-message-form';
import { ScheduledMessagesPanel } from '../scheduled-messages-panel/scheduled-messages-panel';
import { TemplatesPanel } from '../templates-panel/templates-panel';
import { ReminderSettings } from '../reminder-settings/reminder-settings';
import { MessageCenterStore, MessageSection } from '../messages-center.store';

@Component({
  selector: 'app-message-list',
  imports: [
    MessagesStatusBar,
    DirectMessageForm,
    ScheduledMessagesPanel,
    TemplatesPanel,
    ReminderSettings,
  ],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
  private readonly store = inject(MessageCenterStore);
  readonly activeSection = signal<MessageSection>('direct');

  constructor() {
    effect(() => {
      const requested = this.store.requestedSection();
      if (requested) {
        this.activeSection.set(requested);
        this.store.requestedSection.set(null);
      }
    });
  }

  setSection(section: MessageSection) {
    this.activeSection.set(section);
  }
}
