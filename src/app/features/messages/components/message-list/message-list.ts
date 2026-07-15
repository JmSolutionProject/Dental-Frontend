import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, of } from 'rxjs';

import { GetMessagesUseCase } from '../../application/get-messages.usecase';

@Component({
  selector: 'app-message-list',
  imports: [AsyncPipe],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
  private readonly getMessages = inject(GetMessagesUseCase);

  protected readonly messages$ = this.getMessages.execute({ page: 1, limit: 10 }).pipe(
    catchError(() => of({ data: [], total: 0, page: 1, limit: 10 })),
  );
}
