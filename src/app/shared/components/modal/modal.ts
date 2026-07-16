import {
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  title = input.required<string>();
  visible = input(false); size = input<'md' | 'lg' | 'xl'>('md');

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.visible()) {
      this.closeModal();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
  }
}
