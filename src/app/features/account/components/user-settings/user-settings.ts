import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheck, heroKey } from '@ng-icons/heroicons/outline';
import { catchError, finalize, of, take } from 'rxjs';

import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AccountProfile } from '../../domain/account';
import { AccountRepository } from '../../infrastructure/account-api.repository';

@Component({
  selector: 'app-user-settings',
  imports: [ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ heroCheck, heroKey })],
  templateUrl: './user-settings.html',
  styleUrl: './user-settings.css',
})
export class UserSettings implements OnInit {
  private readonly accountRepository = inject(AccountRepository);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly profile = signal<AccountProfile | null>(null);

  readonly tokenUser = this.auth.user;
  readonly roleLabel = computed(() => {
    const profileRoles = this.profile()?.roles.map((role) => role.nombreRol) ?? [];
    const tokenRoles = this.tokenUser()?.roles ?? [];
    const roles = profileRoles.length > 0 ? profileRoles : tokenRoles;

    return roles.length > 0 ? roles.join(', ') : 'Sin rol asignado';
  });

  readonly profileForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit() {
    this.hydrateFromToken();
    this.loadProfile();
  }

  loadProfile() {
    const userId = this.getTokenUserId();
    if (userId === null) {
      this.loading.set(false);
      this.toast.error('No se pudo identificar el usuario autenticado');
      return;
    }

    this.loading.set(true);
    this.accountRepository
      .findById(userId)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo cargar la configuración del usuario');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((profile) => {
        if (!profile) {
          return;
        }

        this.profile.set(profile);
        this.profileForm.patchValue({
          nombreCompleto: profile.nombreCompleto,
          email: profile.email,
        });
      });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    const raw = this.profileForm.getRawValue();

    this.accountRepository
      .updateProfile({
        nombreCompleto: raw.nombreCompleto ?? '',
        email: raw.email ?? '',
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo actualizar el perfil');
          return of(null);
        }),
        finalize(() => this.savingProfile.set(false)),
      )
      .subscribe((profile) => {
        if (!profile) {
          return;
        }

        this.profile.set(profile);
        this.toast.success('Perfil actualizado');
      });
  }

  changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const raw = this.passwordForm.getRawValue();
    if (raw.newPassword !== raw.confirmPassword) {
      this.passwordForm.controls.confirmPassword.setErrors({ mismatch: true });
      return;
    }

    this.savingPassword.set(true);
    this.accountRepository
      .changePassword({
        currentPassword: raw.currentPassword ?? '',
        newPassword: raw.newPassword ?? '',
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo actualizar la contraseña');
          return of(null);
        }),
        finalize(() => this.savingPassword.set(false)),
      )
      .subscribe((result) => {
        if (result === null) {
          return;
        }

        this.passwordForm.reset();
        this.toast.success('Contraseña actualizada');
      });
  }

  private hydrateFromToken() {
    const user = this.tokenUser();
    if (!user) {
      return;
    }

    this.profileForm.patchValue({
      nombreCompleto: user.name,
      email: user.sub.includes('@') ? user.sub : '',
    });
  }

  private getTokenUserId(): number | null {
    const rawId = this.tokenUser()?.sub;
    if (!rawId) {
      return null;
    }

    const id = Number(rawId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
