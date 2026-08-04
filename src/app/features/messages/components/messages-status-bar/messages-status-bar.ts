import { Component, computed, inject, signal } from '@angular/core';
import { Modal } from '../../../../shared/components/modal/modal';
import { MessageCenterStore } from '../messages-center.store';

@Component({
  selector: 'app-messages-status-bar',
  imports: [Modal],
  templateUrl: './messages-status-bar.html',
  styleUrl: './messages-status-bar.css',
})
export class MessagesStatusBar {
  readonly store = inject(MessageCenterStore);
  readonly showQrModal = signal(false);
  readonly pairingPhone = signal('51');

  readonly statusLabel = computed(() => {
    const status = this.store.whatsappStatus();
    if (!status) return 'Sin consultar';
    if (status.ready) return 'Conectado';
    if (status.status === 'qr') return 'Esperando escaneo de QR';
    if (status.status === 'authenticated') return 'Autenticado';
    if (status.status === 'disconnected') return 'Desconectado';
    return status.message || status.status;
  });

  readonly statusClass = computed(() =>
    this.store.whatsappStatus()?.ready ? 'status--ready' : 'status--pending',
  );

  constructor() {
    this.store.loadInitialData();
  }

  refreshWhatsApp() {
    this.store.refreshWhatsApp();
  }

  openQrModal() {
    if (!this.store.qrImage()) this.store.loadQr();
    this.showQrModal.set(true);
  }

  closeQrModal() {
    this.showQrModal.set(false);
  }

  loadQr() {
    this.store.loadQr();
  }

  requestPairingCode() {
    this.store.requestPairingCode(this.pairingPhone());
  }

  updatePairingPhone(event: Event) {
    this.pairingPhone.set((event.target as HTMLInputElement).value);
  }
}
