import { Component, input, output } from '@angular/core';
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
  readonly form = input.required<FormGroup>();
  readonly editing = input(false);
  readonly consultingDni = input(false);

  readonly lookupDni = output<void>();

  onLookupDni(): void {
    this.lookupDni.emit();
  }
}
