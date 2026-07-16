import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroArrowRight,
  heroEnvelope,
  heroExclamationCircle,
  heroEye,
  heroEyeSlash,
  heroLockClosed,
} from '@ng-icons/heroicons/outline';

import { AuthService } from '../../../../core/services/auth';
import { FormField } from '../../../../shared/components/form-field/form-field';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, FormField, NgIcon],
  providers: [
    provideIcons({
      heroArrowRight,
      heroEnvelope,
      heroExclamationCircle,
      heroEye,
      heroEyeSlash,
      heroLockClosed,
    }),
  ],
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
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
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
          errorObj?.error?.message || 'Credenciales inválidas. Por favor verifica tus datos e intenta nuevamente.';
      },
    });
  }
}

