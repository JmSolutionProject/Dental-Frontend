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
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { BirthDateField } from '../../../../shared/components/birth-date-field/birth-date-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ReniecService } from '../../../../core/services/reniec.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

import { PatientRepository } from '../../domain/patient.repository';

@Component({
  selector: 'app-patient-list',
  imports: [ReactiveFormsModule, Modal, FormField, BirthDateField, NgIcon],
  providers: [provideIcons({ heroPlus })],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientList {
  private readonly router = inject(Router);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly createPatient = inject(CreatePatientUseCase);
  private readonly patientRepo = inject(PatientRepository);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly reniec = inject(ReniecService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly result = signal<PaginatedResponse<Patient> | null>(null);
  readonly loading = signal(true);
  readonly showCreateModal = signal(false);
  readonly creating = signal(false);
  readonly consultingDni = signal(false);
  readonly activeTab = signal<'active' | 'inactive' | 'all'>('active');

  readonly patientToDelete = signal<Patient | null>(null);
  readonly showDeleteConfirmModal = signal(false);
  readonly deletingState = signal(false);

  readonly columns: TableColumn[] = [
    { key: 'firstName', label: 'Nombre Completo', sortable: true },
    { key: 'documentNumber', label: 'DNI / Documento' },
    { key: 'phone', label: 'Teléfono WhatsApp' },
    { key: 'status', label: 'Estado' },
  ];

  readonly sortKey = signal<string | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly createForm: FormGroup = this.fb.group({
    documentNumber: ['', [Validators.pattern('^[0-9]{8,12}$')]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
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
          this.toast.error('Error al cargar la lista de pacientes.');
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

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadPatients();
  }

  onRowClick(row: unknown) {
    const patient = row as Patient;
    if (patient && patient.id) {
      this.router.navigate(['/patients', patient.id]);
    }
  }

  statusLabel(status: string | null | undefined): string {
    return status?.toLowerCase() === 'active' ? 'Activo' : status || '—';
  }

  setTab(tab: 'active' | 'inactive' | 'all') {
    this.activeTab.set(tab);
  }
  }

  readonly displayData = computed(() => {
    const res = this.result();
    if (!res) return [];
    const tab = this.activeTab();

    const filtered = res.data.filter((p) => {
      if (tab === 'active') return p.status === 'active';
      if (tab === 'inactive') return p.status === 'inactive' || p.status === 'deleted';
      return true;
    });

    return filtered.map((p) => ({
      ...p,
      firstName: `${p.firstName} ${p.lastName}`,
    }));
  });

  readonly totalItems = computed(() => this.displayData().length);

  openDeleteConfirm(patient: Patient, event?: Event) {
    if (event) event.stopPropagation();
    this.patientToDelete.set(patient);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal.set(false);
    this.patientToDelete.set(null);
  }

  executeDelete() {
    const p = this.patientToDelete();
    if (!p) return;

    this.deletingState.set(true);
    this.patientRepo
      .softDelete(p.id)
      .pipe(
        take(1),
        catchError((err) => {
          console.error('Error al dar de baja al paciente:', err);
          this.toast.error('Error al dar de baja al paciente');
          return of(null);
        }),
        finalize(() => this.deletingState.set(false)),
      )
      .subscribe((result) => {
        if (result) {
          this.toast.success(`Paciente ${p.firstName} ${p.lastName} dado de baja exitosamente.`);
          this.closeDeleteConfirmModal();
          this.loadPatients();
        }
      });
  }

  reactivatePatient(p: Patient, event?: Event) {
    if (event) event.stopPropagation();
    this.patientRepo
      .update(p.id, {
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        documentNumber: p.documentNumber,
        estado: true,
      } as any)
      .pipe(
        take(1),
        catchError((err) => {
          console.error('Error al reactivar al paciente:', err);
          this.toast.error('Error al reactivar al paciente');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.toast.success(`Paciente ${p.firstName} ${p.lastName} reactivado exitosamente.`);
          this.loadPatients();
        }
      });
  }

  openCreateModal() {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  /**
   * Consulta los datos de la RENIEC usando el DNI ingresado
   */
  lookupDni() {
    const dni = this.createForm.get('documentNumber')?.value?.trim();
    if (!dni || dni.length !== 8) {
      this.toast.info('Ingrese un número de DNI válido de 8 dígitos.');
      return;
    }

    this.consultingDni.set(true);

    this.reniec
      .lookupDni(dni)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se encontró información para el DNI ingresado.');
          return of(null);
        }),
        finalize(() => this.consultingDni.set(false)),
      )
      .subscribe((res) => {
        if (!res) return;

        if (res.success && res.data) {
          const nombres = res.data.nombres || '';
          const apellidos =
            res.data.apellidos ||
            `${res.data.apellidoPaterno || ''} ${res.data.apellidoMaterno || ''}`.trim();

          this.createForm.patchValue({
            firstName: nombres.trim(),
            lastName: apellidos.trim(),
          });

          this.toast.success(`¡RENIEC: ${nombres} ${apellidos}!`);
        } else {
          this.toast.error(res.message || 'No se encontró información para el DNI ingresado.');
        }
      });
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
    };

    this.createPatient
      .execute(request)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al registrar el paciente.');
          return of(null);
        }),
        finalize(() => this.creating.set(false)),
      )
      .subscribe((patient) => {
        if (patient) {
          this.toast.success('Paciente registrado exitosamente.');
          this.showCreateModal.set(false);
          this.loadPatients();
        }
      });
  }

  private parseList(value: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private formatDateToIso(rawDate: string | null | undefined): string | null {
    if (!rawDate) return null;
    const str = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, '0');
      const month = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}-${day}`;
    }
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }
    return null;
  }
}
