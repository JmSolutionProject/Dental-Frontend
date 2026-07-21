import { Component, EventEmitter, Input, Output, inject, signal, computed, OnChanges, SimpleChanges, output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { CreateAppointmentRequest } from '../../domain/appointment';
import { CreateAppointmentUseCase } from '../../application/create-appointment.usecase';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';
import { Patient } from '../../../patients/domain/patient';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { API_URL } from '../../../../core/config/api.config';

interface DoctorOption {
  id: string;
  name: string;
}

interface CatalogServiceItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-appointment-form-modal',
  imports: [ReactiveFormsModule, Modal, FormField],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.css',
})
export class AppointmentFormModal implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly createAppointment = inject(CreateAppointmentUseCase);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly toast = inject(ToastService);

  @Input() visible = false;
  @Input() prefill?: { patientId?: string; dentistId?: string; reason?: string; planServicioId?: string; };

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly doctors = signal<DoctorOption[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly catalogServices = signal<CatalogServiceItem[]>([]);
  readonly loadingPatients = signal(true);
  readonly saving = signal(false);
  readonly selectedCategoryId = signal<string>('');

  readonly categories = computed<CategoryOption[]>(() => {
    const map = new Map<string, string>();
    for (const s of this.catalogServices()) {
      if (s.categoryId) map.set(s.categoryId, s.categoryName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  });

  readonly filteredServices = computed<{ id: string; name: string; price: number }[]>(() => {
    const catId = this.selectedCategoryId();
    return this.catalogServices()
      .filter((s) => !catId || s.categoryId === catId)
      .map((s) => ({ id: s.id, name: s.name, price: s.price }));
  });

  readonly form: FormGroup = this.fb.group({
    patientId: ['', [Validators.required]],
    date: [this.todayString(), [Validators.required]],
    time: ['10:00', [Validators.required]],
    dentistId: ['', [Validators.required]],
    serviceId: ['', [Validators.required]],
    reason: ['', [Validators.required]],
    observations: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.selectedCategoryId.set('');
      if (this.prefill) {
        this.form.patchValue({
          patientId: this.prefill.patientId ?? '',
          dentistId: this.prefill.dentistId ?? '',
          reason: this.prefill.reason ?? '',
          serviceId: '',
        });
      } else {
        this.form.reset({
          patientId: '',
          date: this.todayString(),
          time: '10:00',
          dentistId: '',
          serviceId: '',
          reason: '',
        });
      }
    }
  }

  constructor() {
    this.loadDoctors();
    this.loadPatients();
    this.loadCatalog();
  }

  onCategoryChange(event: Event): void {
    const catId = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(catId);
    this.form.patchValue({ serviceId: '', reason: '' }, { emitEvent: false });
  }

  onServiceChange(event: Event): void {
    const serviceId = (event.target as HTMLSelectElement).value;
    const svc = this.filteredServices().find((s) => s.id === serviceId);
    if (svc) {
      this.form.patchValue({ reason: svc.name }, { emitEvent: false });
    }
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const patientId = Number(raw.patientId);
    const dentistId = Number(raw.dentistId);

    if (isNaN(patientId) || patientId <= 0) {
      this.toast.error('Selecciona un paciente válido.');
      return;
    }
    if (isNaN(dentistId) || dentistId <= 0) {
      this.toast.error('Selecciona un especialista válido.');
      return;
    }

    const request: CreateAppointmentRequest = {
      patientId: raw.patientId,
      dentistId: raw.dentistId,
      scheduledAt: this.buildIso(raw.date, raw.time),
      reason: raw.reason.trim(),
      observations: raw.observations?.trim() || undefined,
      patientName: this.getPatientName(raw.patientId),
      dentistName: this.getDoctorName(raw.dentistId),
      planServicioId: this.prefill?.planServicioId,
      serviceId: raw.serviceId || undefined,
    };

    this.saving.set(true);
    this.createAppointment
      .execute(request)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al crear la cita.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((appointment) => {
        if (appointment) {
          this.toast.success('Cita creada exitosamente.');
          this.form.reset({ date: this.todayString(), time: '10:00' });
          this.saved.emit();
        }
      });
  }

  getDoctorName(id: string): string {
    return this.doctors().find((d) => String(d.id) === id)?.name ?? '';
  }

  getPatientName(id: string): string {
    const p = this.patients().find((x) => x.id === id);
    if (!p) return '';
    return `${p.firstName} ${p.lastName}`;
  }

  private loadDoctors(): void {
    this.http.get<{ id: number; nombreCompleto: string }[]>(`${this.apiUrl}/users?role=MEDICO`)
      .pipe(take(1), catchError(() => of([])))
      .subscribe((users) => {
        this.doctors.set(users.map((u) => ({ id: String(u.id), name: u.nombreCompleto })));
      });
  }

  private loadPatients(): void {
    this.loadingPatients.set(true);
    this.getPatients
      .execute({ page: 1, limit: 500 })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('No se pudo cargar la lista de pacientes.');
          return of({ data: [], total: 0, page: 1, limit: 10 });
        }),
        finalize(() => this.loadingPatients.set(false)),
      )
      .subscribe((res) => this.patients.set(res.data));
  }

  private loadCatalog(): void {
    this.http.get<{ data: CatalogServiceItem[] }>(`${this.apiUrl}/catalog/services?limit=100`)
      .pipe(take(1), catchError(() => of({ data: [] })))
      .subscribe((res) => this.catalogServices.set(res.data));
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private buildIso(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }
}
