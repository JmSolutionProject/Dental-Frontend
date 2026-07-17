import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { BirthDateField } from '../../../../shared/components/birth-date-field/birth-date-field';

@Component({
  selector: 'app-personal-data-form',
  imports: [ReactiveFormsModule, FormField, BirthDateField],
  templateUrl: './personal-data-form.html',
  styleUrl: './personal-data-form.css',
})
export class PersonalDataForm {
  @Input({ required: true }) form!: FormGroup;
  @Input() editing = false;
  @Input() consultingDni = false;

  @Output() readonly lookupDni = new EventEmitter<void>();

  onLookupDni(): void {
    this.lookupDni.emit();
  }
}
