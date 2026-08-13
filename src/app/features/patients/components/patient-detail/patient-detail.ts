import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { take, catchError, of, finalize } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLeftCircle, heroPencilSquare, heroCheck, heroXMark, heroTrash } from '@ng-icons/heroicons/outline';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ReniecService } from '../../../../core/services/reniec.service';
import { MedicalAlertService } from '../../../../core/services/medical-alert.service';
import { AuthService } from '../../../../core/services/auth';
import { API_URL } from '../../../../core/config/api.config';

import { GetPatientUseCase } from '../../application/get-patient.usecase';
import { UpdatePatientUseCase } from '../../application/update-patient.usecase';
import { DeletePatientUseCase } from '../../application/delete-patient.usecase';
import { GetAppointmentsUseCase } from '../../../appointments/application/get-appointments.usecase';
import { Appointment } from '../../../appointments/domain/appointment';
import { Patient, UpdatePatientRequest, SystemMedicalAlert, AppointmentRecord, TreatmentPlanItem, TreatmentPlan, ALLERGY_OPTIONS, DISEASE_OPTIONS, SPECIAL_CONDITION_OPTIONS, DENTAL_HISTORY_OPTIONS } from '../../domain/patient';

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
    provideIcons({ heroArrowLeftCircle, heroPencilSquare, heroCheck, heroXMark, heroTrash })
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
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly getAppointments = inject(GetAppointmentsUseCase);

  readonly role = this.auth.role;
  readonly patient = signal<Patient | null>(null);
  readonly patientAppointments = signal<Appointment[]>([]);
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
    allergies: [],
    diseases: [],
    specialConditions: [],
    dentalHistory: [],
    takesMedication: false,
  });

  // COMPUTED FROM REAL APPOINTMENT DATA
  readonly assignedDoctor = computed(() => {
    const completed = this.patientAppointments()
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return completed.length > 0 ? (completed[0].dentistName || 'Sin asignar') : 'Sin asignar';
  });

  readonly lastVisitDate = computed(() => {
    const completed = this.patientAppointments()
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    if (completed.length === 0) return '';
    return new Date(completed[0].scheduledAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  readonly nextAppointmentDate = computed(() => {
    const now = new Date();
    const upcoming = this.patientAppointments()
      .filter(a => a.status === 'scheduled' && new Date(a.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    if (upcoming.length === 0) return '';
    const d = new Date(upcoming[0].scheduledAt);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) + ' - ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  });

  readonly totalAppointments = computed(() => this.patientAppointments().length);
  readonly completedAppointments = computed(() => this.patientAppointments().filter(a => a.status === 'completed').length);

  // Appointments History
  readonly appointmentsHistory = signal<AppointmentRecord[]>([]);

  // Unified Treatment Plans
  readonly treatmentPlans = signal<TreatmentPlan[]>([]);

  readonly budgetTotal = computed(() =>
    this.treatmentPlans().reduce((acc, p) => acc + p.totalCost, 0)
  );

  readonly budgetPending = computed(() => {
    return this.budgetTotal();
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
            this.loadTreatmentPlans(p.id);
            this.loadPatientAppointments(p.id);
          }
        });
    });
  }

  private loadTreatmentPlans(patientId: string) {
    if (!patientId || patientId === 'undefined' || patientId === 'null') {
      this.treatmentPlans.set([]);
      return;
    }
    this.http.get<any[]>(`${this.apiUrl}/treatment-plans?patientId=${patientId}`)
      .pipe(
        take(1),
        catchError(() => of([]))
      )
      .subscribe((plans) => {
        const mappedPlans = plans.map(p => {
          const totalCost = p.servicios.reduce((sum: number, s: any) => {
            const precio = Number(s.servicio?.precioActual || s.servicio?.precio || 0);
            return sum + (precio * (s.cantidad || 1));
          }, 0);

          return {
            id: String(p.id),
            name: p.observaciones || 'Plan de Tratamiento',
            date: new Date(p.fechaCreacion).toLocaleDateString('es-PE'),
            doctorId: p.medicoId ? String(p.medicoId) : undefined,
            items: p.servicios.map((s: any) => ({
              id: String(s.id),
              serviceId: s.servicio?.id ? String(s.servicio.id) : undefined,
              serviceName: s.servicio?.nombreServicio || 'Servicio',
              price: Number(s.servicio?.precioActual || s.servicio?.precio || 0),
              ejecutado: s.ejecutado,
            })),
            totalCost: totalCost,
            estado: p.estado || 'Activo',
            observaciones: p.observaciones || ''
          } as TreatmentPlan;
        });
        this.treatmentPlans.set(mappedPlans);
      });
  }

  private loadPatientAppointments(patientId: string) {
    this.http.get<{ data: Array<{
      id: string; patientId: string; patientName: string; dentistId: string; dentistName: string;
      scheduledAt: string; reason: string; status: string;
    }> }>(`${this.apiUrl}/appointments?limit=100`)
      .pipe(take(1), catchError(() => of({ data: [] })))
      .subscribe((res) => {
        const filtered = res.data.filter((a) => a.patientId === patientId || String(a.patientId) === patientId);
        const raw: Appointment[] = filtered.map((a) => ({
          id: a.id,
          patientId: a.patientId,
          patientName: a.patientName,
          dentistId: a.dentistId,
          dentistName: a.dentistName,
          scheduledAt: a.scheduledAt,
          reason: a.reason,
          status: a.status as Appointment['status'],
        }));
        this.patientAppointments.set(raw);

        const records = filtered.map((a) => {
          const statusMap: Record<string, AppointmentRecord['status']> = {
            scheduled: 'Programada', completed: 'Finalizada', cancelled: 'Cancelada',
          };
          return {
            id: a.id,
            date: new Date(a.scheduledAt).toLocaleDateString('es-PE'),
            doctor: a.dentistName || 'Sin asignar',
            reason: a.reason || 'Sin motivo',
            status: (statusMap[a.status] || 'Programada') as AppointmentRecord['status'],
          };
        });
        this.appointmentsHistory.set(records);
      });
  }

  onPlanAdded(newPlan: TreatmentPlan) {
    this.treatmentPlans.update((plans) => [newPlan, ...plans]);
    this.reloadTreatmentPlans();
  }

  reloadTreatmentPlans() {
    const p = this.patient();
    if (p) {
      this.loadTreatmentPlans(p.id);
    }
  }

  private populateForm(p: Patient) {
    const mh = p.medicalHistory || { allergies: [], conditions: [], specialConditions: [], dentalHistory: [], medications: [] };
    this.medicalHistoryData.set({
      allergies: mh.allergies || [],
      diseases: mh.conditions || [],
      specialConditions: mh.specialConditions || [],
      dentalHistory: mh.dentalHistory || [],
      takesMedication: (mh.medications || []).length > 0,
    });

    this.form.patchValue({
      firstName: p.firstName,
      lastName: p.lastName,
      documentNumber: p.documentNumber,
      phone: p.phone,
      email: p.email ?? '',
      birthDate: p.birthDate ?? '',
      gender: 'Masculino',
      emergencyRelationship: '',
      emergencyPhone: '',
      customAllergy: '',
      customDisease: '',
      medicationDetails: (mh.medications || []).join(', '),
      observations: p.notes || '',
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
          this.populateForm(updated);
          this.editing.set(false);
          this.toast.success('Expediente del paciente actualizado correctamente.');
        }
      });
  }

  saveObservations() {
    const p = this.patient();
    if (!p) return;

    this.saving.set(true);

    const observaciones = this.form.get('observations')?.value || '';

    this.updatePatient
      .execute(p.id, { observaciones: observaciones || undefined })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al guardar observaciones.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.patient.set(updated);
          this.populateForm(updated);
          this.toast.success('Observaciones guardadas correctamente.');
        }
      });
  }

  private buildUpdateRequest(): UpdatePatientRequest {
    const raw = this.form.getRawValue();
    const emergencyRelationship = (raw.emergencyRelationship || '').trim();
    const emergencyPhone = (raw.emergencyPhone || '').trim();
    const emergencyContact = [emergencyRelationship, emergencyPhone].filter(Boolean).join(' ');
    const mhData = this.medicalHistoryData();

    return {
      firstName: raw.firstName,
      lastName: raw.lastName,
      documentNumber: raw.documentNumber,
      phone: raw.phone,
      email: raw.email || undefined,
      birthDate: raw.birthDate || undefined,
      medicalHistory: {
        allergies: (mhData.allergies || []).filter((a) => a && a !== 'Ninguna' && a !== 'Ninguno'),
        conditions: (mhData.diseases || []).filter((c) => c && c !== 'Ninguna' && c !== 'Ninguno'),
        specialConditions: (mhData.specialConditions || []).filter((s) => s && s !== 'Ninguna' && s !== 'Ninguno'),
        dentalHistory: (mhData.dentalHistory || []).filter((d) => d && d !== 'Ninguno'),
        medications: mhData.takesMedication ? this.parseList(raw.medicationDetails) : [],
      },
      notes: [emergencyContact, raw.notes].filter(Boolean).join('\n'),
      observaciones: raw.observations || undefined,
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
