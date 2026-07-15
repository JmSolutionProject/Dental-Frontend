import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { take, catchError, of, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';

import { GetPatientsUseCase } from '../../application/get-patients.usecase';
import { CreatePatientUseCase } from '../../application/create-patient.usecase';
import { PaginatedResponse, FindAllParams } from '../../domain/patient.repository';
import { Patient, CreatePatientRequest } from '../../domain/patient';
import { Table, TableColumn } from '../../../../shared/components/table/table';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-patient-list',
  imports: [ReactiveFormsModule, Table, Modal, FormField],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientList {
  private readonly router = inject(Router);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly createPatient = inject(CreatePatientUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly result = signal<PaginatedResponse<Patient> | null>(null);
  readonly loading = signal(true);
  readonly showCreateModal = signal(false);
  readonly creating = signal(false);

  readonly columns: TableColumn[] = [
    { key: 'firstName', label: 'Name', sortable: true },
    { key: 'documentNumber', label: 'Document' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
  ];

  readonly sortKey = signal<string | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly createForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    documentNumber: [''],
    phone: ['', [Validators.required]],
    allergies: [''],
    birthDate: [''],
  });

  private readonly search$ = toObservable(this.searchText).pipe(
    debounceTime(300),
    distinctUntilChanged(),
  );

  constructor() {
    this.loadPatients();

    // Reload when search text changes
    this.search$.subscribe(() => {
      this.currentPage.set(1);
      this.loadPatients();
    });
  }

  loadPatients() {
    this.loading.set(true);

    const params: FindAllParams = {
      search: this.searchText() || undefined,
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.sortKey()) {
      params.sortBy = this.sortKey()!;
      params.sortDir = this.sortDir();
    }

    this.getPatients
      .execute(params)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to load patients.');
          const empty: PaginatedResponse<Patient> = {
            data: [],
            total: 0,
            page: 1,
            limit: this.pageSize(),
          };
          return of(empty);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((res) => {
        this.result.set(res);
      });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
  }

  onSortChange(event: { key: string; dir: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDir.set(event.dir);
    this.currentPage.set(1);
    this.loadPatients();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadPatients();
  }

  onRowClick(row: unknown) {
    const patient = row as Patient;
    if (patient && patient.id) {
      this.router.navigate(['/patients', patient.id]);
    }
  }

  readonly displayData = computed(() => {
    const res = this.result();
    if (!res) return [];
    return res.data.map((p) => ({
      ...p,
      firstName: `${p.firstName} ${p.lastName}`,
    }));
  });

  readonly totalItems = computed(() => this.result()?.total ?? 0);

  openCreateModal() {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    const raw = this.createForm.getRawValue();
    const request: CreatePatientRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      documentNumber: raw.documentNumber?.trim() || '',
      phone: raw.phone.trim(),
      birthDate: raw.birthDate || undefined,
      medicalHistory: {
        allergies: this.parseList(raw.allergies),
      },
    };

    this.createPatient
      .execute(request)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to create patient.');
          return of(null);
        }),
        finalize(() => this.creating.set(false)),
      )
      .subscribe((patient) => {
        if (patient) {
          this.toast.success('Patient created successfully.');
          this.showCreateModal.set(false);
          this.loadPatients();
          return;
        }

        this.toast.info('The backend accepted the request, but patient creation is still pending.');
        this.showCreateModal.set(false);
        this.loadPatients();
      });
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
