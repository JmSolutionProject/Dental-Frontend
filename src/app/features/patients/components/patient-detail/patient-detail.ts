import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take, catchError, of, finalize } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { GetPatientUseCase } from '../../application/get-patient.usecase';
import { UpdatePatientUseCase } from '../../application/update-patient.usecase';
import { DeletePatientUseCase } from '../../application/delete-patient.usecase';
import { Patient, UpdatePatientRequest } from '../../domain/patient';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';

type DetailTab = 'profile' | 'medical-history' | 'notes';

@Component({
  selector: 'app-patient-detail',
  imports: [ReactiveFormsModule, RouterLink, Modal, FormField],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getPatient = inject(GetPatientUseCase);
  private readonly updatePatient = inject(UpdatePatientUseCase);
  private readonly deletePatient = inject(DeletePatientUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly showDeleteModal = signal(false);
  readonly activeTab = signal<DetailTab>('profile');

  readonly form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    documentNumber: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: [''],
    birthDate: [''],
    allergies: [''],
    conditions: [''],
    medications: [''],
    notes: [''],
  });

  constructor() {
    this.loadPatient();
  }

  private loadPatient() {
    this.loading.set(true);
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.toast.error('Patient ID not found in route.');
        this.router.navigate(['/patients']);
        return;
      }

      this.getPatient
        .execute(id)
        .pipe(
          take(1),
          catchError(() => {
            this.toast.error('Failed to load patient record.');
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        )
        .subscribe((p) => {
          if (p) {
            this.patient.set(p);
            this.populateForm(p);
          }
        });
    });
  }

  private populateForm(p: Patient) {
    this.form.patchValue({
      firstName: p.firstName,
      lastName: p.lastName,
      documentNumber: p.documentNumber,
      phone: p.phone,
      email: p.email ?? '',
      birthDate: p.birthDate ?? '',
      allergies: p.medicalHistory.allergies.join(', '),
      conditions: p.medicalHistory.conditions.join(', '),
      medications: p.medicalHistory.medications.join(', '),
      notes: p.notes,
    });
  }

  setTab(tab: DetailTab) {
    this.activeTab.set(tab);
  }

  startEdit() {
    this.editing.set(true);
  }

  cancelEdit() {
    const p = this.patient();
    if (p) {
      this.populateForm(p);
    }
    this.editing.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const p = this.patient();
    if (!p) return;

    this.saving.set(true);

    const data: UpdatePatientRequest = this.buildUpdateRequest();

    this.updatePatient
      .execute(p.id, data)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to update patient.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.patient.set(updated);
          this.editing.set(false);
          this.toast.success('Patient updated successfully.');
        }
      });
  }

  private buildUpdateRequest(): UpdatePatientRequest {
    const raw = this.form.getRawValue();
    return {
      firstName: raw.firstName,
      lastName: raw.lastName,
      documentNumber: raw.documentNumber,
      phone: raw.phone,
      email: raw.email || undefined,
      birthDate: raw.birthDate || undefined,
      medicalHistory: {
        allergies: this.parseList(raw.allergies),
        conditions: this.parseList(raw.conditions),
        medications: this.parseList(raw.medications),
      },
      notes: raw.notes,
    };
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  openDeleteModal() {
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
  }

  confirmDelete() {
    const p = this.patient();
    if (!p) return;

    this.deleting.set(true);

    this.deletePatient
      .execute(p.id)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to delete patient.');
          return of(null);
        }),
        finalize(() => {
          this.deleting.set(false);
          this.showDeleteModal.set(false);
        }),
      )
      .subscribe((deleted) => {
        if (deleted) {
          this.toast.success('Patient deleted successfully.');
          this.router.navigate(['/patients']);
        }
      });
  }
}
