import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { CreateAppointmentRequest } from '../../domain/appointment';
import { CreateAppointmentUseCase } from '../../application/create-appointment.usecase';
import { GetPatientsUseCase } from '../../../patients/application/get-patients.usecase';
import { Patient } from '../../../patients/domain/patient';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';

interface DoctorOption {
  id: string;
  name: string;
}

const DOCTORS: DoctorOption[] = [
  { id: 'dr-carlos-perez', name: 'Dr. Carlos Pérez S.' },
  { id: 'dra-maria-ruiz', name: 'Dra. María Ruiz M.' },
  { id: 'dr-jorge-mendoza', name: 'Dr. Jorge Mendoza' },
];

@Component({
  selector: 'app-appointment-form-modal',
  imports: [ReactiveFormsModule, Modal, FormField],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.css',
})
export class AppointmentFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly createAppointment = inject(CreateAppointmentUseCase);
  private readonly getPatients = inject(GetPatientsUseCase);
  private readonly toast = inject(ToastService);

  @Input() visible = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly doctors: DoctorOption[] = DOCTORS;

  readonly patients = signal<Patient[]>([]);
  readonly loadingPatients = signal(true);
  readonly saving = signal(false);

  readonly form: FormGroup = this.fb.group({
    patientId: ['', [Validators.required]],
    date: [this.todayString(), [Validators.required]],
    time: ['10:00', [Validators.required]],
    dentistId: ['', [Validators.required]],
    reason: ['', [Validators.required]],
  });

  constructor() {
    this.loadPatients();
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
    const request: CreateAppointmentRequest = {
      patientId: raw.patientId,
      dentistId: raw.dentistId || undefined,
      scheduledAt: this.buildIso(raw.date, raw.time),
      reason: raw.reason.trim(),
      patientName: this.getPatientName(raw.patientId),
      dentistName: raw.dentistId ? this.getDoctorName(raw.dentistId) : undefined,
    };

    this.saving.set(true);

    this.createAppointment
      .execute(request)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al crear la cita. Verifica los datos e intenta nuevamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((appointment) => {
        if (appointment) {
          this.toast.success('Cita creada exitosamente.');
          this.form.reset({
            date: this.todayString(),
            time: '10:00',
          });
          this.saved.emit();
        }
      });
  }

  getDoctorName(id: string): string {
    return DOCTORS.find((d) => d.id === id)?.name ?? '';
  }

  getPatientName(id: string): string {
    const p = this.patients().find((x) => x.id === id);
    if (!p) return '';
    return `${p.firstName} ${p.lastName}`;
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
      .subscribe((res) => {
        this.patients.set(res.data);
      });
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private buildIso(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }
}
