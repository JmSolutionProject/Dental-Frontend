import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take, catchError, of, finalize } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ReniecService } from '../../../../core/services/reniec.service';
import { MedicalAlertService } from '../../../../core/services/medical-alert.service';
import { AuthService } from '../../../../core/services/auth';

import { GetPatientUseCase } from '../../application/get-patient.usecase';
import { UpdatePatientUseCase } from '../../application/update-patient.usecase';
import { DeletePatientUseCase } from '../../application/delete-patient.usecase';
import { Patient, UpdatePatientRequest, SystemMedicalAlert, AppointmentRecord, BudgetItemRecord, PaymentRecord, InstallmentRecord, TreatmentPlanItem, TreatmentPlan, ALLERGY_OPTIONS, DISEASE_OPTIONS, SPECIAL_CONDITION_OPTIONS, DENTAL_HISTORY_OPTIONS } from '../../domain/patient';

import { ToothChart } from '../../../../shared/components/tooth-chart/tooth-chart';
import { Modal as ModalComponent } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { PatientSummaryTab } from '../patient-summary-tab/patient-summary-tab';
import { PatientOdontogramTab } from '../patient-odontogram-tab/patient-odontogram-tab';
import { PatientTreatmentPlanTab } from '../patient-treatment-plan-tab/patient-treatment-plan-tab';
import { PatientMedicalHistoryTab, MedicalHistoryData } from '../patient-medical-history-tab/patient-medical-history-tab';
import { PatientAttachmentsTab } from '../patient-attachments-tab/patient-attachments-tab';
import { PatientPaymentsTab } from '../patient-payments-tab/patient-payments-tab';
import { PersonalDataForm } from '../personal-data-form/personal-data-form';
import { ObservationsTab } from '../observations-tab/observations-tab';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLeftCircle } from '@ng-icons/heroicons/outline';

export type DetailTab =
  | 'summary'
  | 'personal-data'
  | 'medical-history'
  | 'odontogram'
  | 'appointments-history'
  | 'budget-plan'
  | 'payments'
  | 'attachments'
  | 'observations';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ModalComponent, PersonalDataForm, ObservationsTab, PatientSummaryTab, PatientOdontogramTab, PatientTreatmentPlanTab, PatientMedicalHistoryTab, PatientAttachmentsTab, PatientPaymentsTab, NgIcon],
  providers: [
    provideIcons({ heroArrowLeftCircle })
  ],
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
  private readonly reniec = inject(ReniecService);
  private readonly medicalAlert = inject(MedicalAlertService);
  private readonly auth = inject(AuthService);

  readonly role = this.auth.role;
  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly showDeleteModal = signal(false);
  readonly consultingDni = signal(false);

  // Active Tab
  readonly activeTab = signal<DetailTab>('summary');

  // Medical History Data (Maintained by PatientMedicalHistoryTab)
  readonly medicalHistoryData = signal<MedicalHistoryData>({
    allergies: ['Penicilina', 'Látex'],
    diseases: ['Diabetes', 'Hipertensión arterial'],
    specialConditions: [],
    dentalHistory: ['Bruxismo'],
    takesMedication: true,
  });

  // STATICS FOR PATIENT DOSSIER
  readonly assignedDoctor = signal('Dr. Carlos Pérez S.');
  readonly lastVisitDate = signal('15/07/2026');
  readonly nextAppointmentDate = signal('22/07/2026 - 10:30 AM');

  // Appointments History
  readonly appointmentsHistory = signal<AppointmentRecord[]>([
    { id: '1', date: '15/07/2026', doctor: 'Dr. Carlos Pérez S.', reason: 'Evaluación y Limpieza Ultrasónica', status: 'Finalizada' },
    { id: '2', date: '22/07/2026', doctor: 'Dra. María Ruiz M.', reason: 'Endodoncia Unirradicular Pieza 36', status: 'Programada' },
    { id: '3', date: '05/06/2026', doctor: 'Dr. Carlos Pérez S.', reason: 'Consulta Inicial y Odontograma', status: 'Finalizada' },
  ]);

  // Unified Treatment Plans
  readonly treatmentPlans = signal<TreatmentPlan[]>([
    {
      id: 'tp-1',
      name: 'Tratamiento Integral Inicial',
      date: '10/06/2026',
      items: [
        { id: 'i1', serviceName: 'Limpieza e Higiene Profunda Ultrasónica', price: 120 },
        { id: 'i2', serviceName: 'Curación con Resina Simple', price: 80 }
      ],
      totalCost: 200,
      paymentType: 'Al Contado'
    }
  ]);

  readonly budgetTotal = computed(() =>
    this.treatmentPlans().reduce((acc, p) => acc + p.totalCost, 0)
  );

  readonly budgetPaid = computed(() => {
    return this.treatmentPlans().reduce((acc, p) => {
      if (p.paymentType === 'A Cuotas' && p.installments) {
        return acc + p.installments.filter(i => i.status === 'Pagado').reduce((sum, i) => sum + i.amount, 0);
      }
      return acc;
    }, 0);
  });

  readonly budgetPending = computed(() => {
    return this.budgetTotal() - this.budgetPaid();
  });

  // Form Binding
  readonly form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    documentNumber: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: [''],
    birthDate: [''],
    gender: ['Masculino'],
    emergencyRelationship: [''],
    emergencyPhone: [''],
    customAllergy: [''],
    customDisease: [''],
    medicationDetails: ['Metformina 850mg diario, Losartán 50mg'],
    observations: [''],
    notes: [''],
  });

  constructor() {
    this.loadPatient();
  }

  onMedicalHistoryChanged(data: MedicalHistoryData) {
    this.medicalHistoryData.set(data);
  }

  // AUTOMATED MEDICAL ALERT EVALUATOR
  readonly systemMedicalAlerts = computed<SystemMedicalAlert[]>(() => {
    return this.medicalAlert.evaluate(
      this.medicalHistoryData(),
      this.form.get('customAllergy')?.value || '',
    );
  });

  private loadPatient() {
    this.loading.set(true);
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.toast.error('ID del paciente no encontrado.');
        this.router.navigate(['/patients']);
        return;
      }

      this.getPatient
        .execute(id)
        .pipe(
          take(1),
          catchError(() => {
            this.toast.error('No se pudo cargar el expediente del paciente.');
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
      gender: 'Masculino',
      emergencyRelationship: 'Madre',
      emergencyPhone: '+51 988 123 456',
      customAllergy: '',
      customDisease: '',
      medicationDetails: 'Metformina 850mg diario, Losartán 50mg',
      observations: 'Paciente refiere leve ansiedad en consulta. Solicita anestesia tópica previa a infiltración.',
      notes: p.notes,
    });
  }

  setTab(tab: DetailTab) {
    this.activeTab.set(tab);
  }

  startEdit() {
    this.editing.set(true);
  }

  lookupDni() {
    const dni = this.form.get('documentNumber')?.value?.trim();
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

          this.form.patchValue({
            firstName: nombres.trim(),
            lastName: apellidos.trim(),
          });

          this.toast.success(`¡RENIEC: ${nombres} ${apellidos}!`);
        } else {
          this.toast.error(res.message || 'No se encontró información para el DNI ingresado.');
        }
      });
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
          this.toast.error('Error al actualizar datos del paciente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.patient.set(updated);
          this.editing.set(false);
          this.toast.success('Expediente del paciente actualizado correctamente.');
        }
      });
  }

  private buildUpdateRequest(): UpdatePatientRequest {
    const raw = this.form.getRawValue();
    const emergencyRelationship = (raw.emergencyRelationship || '').trim();
    const emergencyPhone = (raw.emergencyPhone || '').trim();
    const emergencyContact = [emergencyRelationship, emergencyPhone].filter(Boolean).join(' ');

    return {
      firstName: raw.firstName,
      lastName: raw.lastName,
      documentNumber: raw.documentNumber,
      phone: raw.phone,
      email: raw.email || undefined,
      birthDate: raw.birthDate || undefined,
      medicalHistory: {
        allergies: this.medicalHistoryData().allergies,
        conditions: this.medicalHistoryData().diseases,
        medications: this.medicalHistoryData().takesMedication ? this.parseList(raw.medicationDetails) : [],
      },
      notes: [emergencyContact, raw.notes].filter(Boolean).join('\n'),
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
          this.toast.error('Error al dar de baja al paciente.');
          return of(null);
        }),
        finalize(() => {
          this.deleting.set(false);
          this.showDeleteModal.set(false);
        }),
      )
      .subscribe((deleted) => {
        if (deleted) {
          this.toast.success('Paciente dado de baja exitosamente.');
          this.router.navigate(['/patients']);
        }
      });
  }

}
