import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth';
import { FormField } from '../../../../shared/components/form-field/form-field';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, FormField],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly auth: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  serverError: string | null = null;
  submitting = false;

  submit() {
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.serverError = null;
    this.submitting = true;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.submitting = false;
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: unknown) => {
        this.submitting = false;
        const errorObj = err as { error?: { message?: string } } | undefined;
        this.serverError =
          errorObj?.error?.message || 'Invalid credentials. Please try again.';
      },
    });
  }
}
