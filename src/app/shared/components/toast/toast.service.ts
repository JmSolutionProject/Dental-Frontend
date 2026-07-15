import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  success(message: string, durationMs = 4000) {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = 5000) {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs = 4000) {
    this.show('info', message, durationMs);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(type: ToastMessage['type'], message: string, durationMs: number) {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, type, message }]);

    setTimeout(() => this.dismiss(id), durationMs);
  }
}
