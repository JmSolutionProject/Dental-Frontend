import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { finalize } from 'rxjs';
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

  constructor() {
    this.form.valueChanges.subscribe(() => {
      if (!this.serverError) {
        return;
      }

      this.serverError = null;
      this.clearServerError(this.form.controls.email);
      this.clearServerError(this.form.controls.password);
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.serverError = null;
    this.clearServerError(this.form.controls.email);
    this.clearServerError(this.form.controls.password);
    this.submitting = true;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).pipe(
      finalize(() => {
        this.submitting = false;
      }),
    ).subscribe({
      next: () => {
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: unknown) => {
        const errorObj = err as { error?: { message?: string } } | undefined;
        const message =
          errorObj?.error?.message || 'El email o la contraseña son incorrectos.';

        this.serverError = message;
        this.form.controls.email.setErrors({
          ...this.form.controls.email.errors,
          serverError: message,
        });
        this.form.controls.password.setErrors({
          ...this.form.controls.password.errors,
          serverError: message,
        });
        this.form.controls.email.markAsTouched();
        this.form.controls.password.markAsTouched();
      },
    });
  }

  private clearServerError(control: FormControl): void {
    const errors = control.errors;
    if (!errors?.['serverError']) {
      return;
    }

    const { serverError, ...remainingErrors } = errors;
    control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
  }
}

