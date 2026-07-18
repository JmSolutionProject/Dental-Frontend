import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-observations-tab',
  imports: [ReactiveFormsModule],
  templateUrl: './observations-tab.html',
  styleUrl: './observations-tab.css',
})
export class ObservationsTab {
  readonly form = input.required<FormGroup>();
  readonly saving = input(false);

  readonly saveRequested = output<void>();

  onSave(): void {
    this.saveRequested.emit();
  }
}
