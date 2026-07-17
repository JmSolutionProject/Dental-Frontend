import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-observations-tab',
  imports: [ReactiveFormsModule],
  templateUrl: './observations-tab.html',
  styleUrl: './observations-tab.css',
})
export class ObservationsTab {
  @Input({ required: true }) form!: FormGroup;
  @Input() saving = false;

  @Output() readonly saveRequested = new EventEmitter<void>();

  onSave(): void {
    this.saveRequested.emit();
  }
}
