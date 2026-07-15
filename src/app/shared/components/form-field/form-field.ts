import { Component, input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
@Component({
  selector: 'app-form-field',
  imports: [ReactiveFormsModule],
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
})
export class FormField {
  label = input.required<string>();
  control = input.required<FormControl | AbstractControl>();

  get isInvalid(): boolean {
    const control = this.control();
    return control.invalid && (control.dirty || control.touched);
  }

  get errorMessage(): string | null {
    const errors = this.control().errors;
    if (!errors) return null;

    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['email']) {
      return 'Enter a valid email address.';
    }
    if (errors['minlength']) {
      return `Minimum ${errors['minlength'].requiredLength} characters required.`;
    }
    if (errors['maxlength']) {
      return `Maximum ${errors['maxlength'].requiredLength} characters allowed.`;
    }
    if (errors['pattern']) {
      return 'Invalid format.';
    }
    if (typeof errors['serverError'] === 'string') {
      return errors['serverError'];
    }

    return 'Invalid input.';
  }
}
