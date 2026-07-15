import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  imports: [NgClass],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  readonly toastService = inject(ToastService);
}
