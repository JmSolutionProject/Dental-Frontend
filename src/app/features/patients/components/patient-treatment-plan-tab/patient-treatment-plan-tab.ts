import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { take, catchError, of } from 'rxjs';
import { TreatmentPlan, TreatmentPlanItem, InstallmentRecord } from '../../domain/patient';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { API_URL } from '../../../../core/config/api.config';
import { AppointmentFormModal } from '../../../appointments/components/appointment-form-modal/appointment-form-modal';

interface CatalogService {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
}
interface Doctor { id: number; nombreCompleto: string; }

@Component({
  selector: 'app-patient-treatment-plan-tab',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, FormField, AppointmentFormModal],
  templateUrl: './patient-treatment-plan-tab.html',
  styleUrl: './patient-treatment-plan-tab.css'
})
export class PatientTreatmentPlanTab {
  treatmentPlans = input<TreatmentPlan[]>([]);
  planAdded = output<TreatmentPlan>();
  reloadPlans = output<void>();
  patientId = input<string>('');

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly showPlanBuilderModal = signal(false);
  readonly catalogServices = signal<CatalogService[]>([]);
  readonly doctors = signal<Doctor[]>([]);
  readonly saving = signal(false);
  readonly builderItems = signal<TreatmentPlanItem[]>([]);
  readonly builderServiceId = signal<string>('');
  readonly selectedCategoryId = signal<string>('');
  readonly showAppointmentModal = signal(false);
  readonly appointmentPrefill = signal<any>(null);
  readonly showEditModal = signal(false);
  readonly editingPlan = signal<TreatmentPlan | null>(null);

  readonly planBuilderForm: FormGroup = this.fb.group({
    planName: ['Plan de Tratamiento', Validators.required],
    paymentType: ['Al Contado', Validators.required],
    advancePayment: [0, [Validators.min(0)]],
    installmentsCount: [1, [Validators.min(1), Validators.max(24)]],
    frequency: ['Mensual'],
    doctorId: [0, [Validators.required, Validators.min(1)]],
  });

  readonly editPlanForm: FormGroup = this.fb.group({
    planName: ['', Validators.required],
    estado: ['Activo', Validators.required],
  });

  private readonly formValue = toSignal(this.planBuilderForm.valueChanges, { initialValue: this.planBuilderForm.getRawValue() });

  readonly categories = computed(() => {
    const list = this.catalogServices().map(s => ({
      id: s.categoryId,
      name: s.categoryName
    }));
    const uniqueMap = new Map<string, string>();
    list.forEach(item => {
      if (item.id) uniqueMap.set(item.id, item.name);
    });
    return Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));
  });

  readonly availableServices = computed(() => {
    const catId = this.selectedCategoryId();
    let services = this.catalogServices();
    if (catId) {
      services = services.filter(s => s.categoryId === catId);
    }
    return services.map((s) => ({ id: s.id, name: s.name, basePrice: s.price }));
  });

  readonly builderSubtotal = computed(() =>
    this.builderItems().reduce((sum, item) => sum + item.price, 0)
  );

  readonly advanceAmount = computed(() => Number(this.formValue().advancePayment) || 0);
  readonly remainingAfterAdvance = computed(() => Math.max(0, this.builderSubtotal() - this.advanceAmount()));
  readonly isAQuotas = computed(() => this.formValue().paymentType === 'A Cuotas');

  readonly generatedInstallments = computed<InstallmentRecord[]>(() => {
    if (!this.isAQuotas()) return [];
    const remaining = this.remainingAfterAdvance();
    if (remaining <= 0) return [];
    const count = Number(this.formValue().installmentsCount) || 1;
    const freq = this.formValue().frequency || 'Mensual';
    const amountPerInstallment = Number((remaining / count).toFixed(2));

    const result: InstallmentRecord[] = [];
    if (this.advanceAmount() > 0) {
      result.push({ id: 'advance', date: new Date().toLocaleDateString('es-PE'), amount: this.advanceAmount(), status: 'Pagado' });
    }
    let currentDate = new Date();
    for (let i = 1; i <= count; i++) {
      if (freq === 'Quincenal') currentDate.setDate(currentDate.getDate() + 15);
      else currentDate.setMonth(currentDate.getMonth() + 1);

      let amount = amountPerInstallment;
      if (i === count) {
        amount = Number((remaining - (amountPerInstallment * (count - 1))).toFixed(2));
      }

      result.push({ id: `inst-${i}`, date: currentDate.toLocaleDateString('es-PE'), amount: amount, status: 'Pendiente' });
    }
    return result;
  });

  constructor() {
    this.loadCatalog();
    this.loadDoctors();
  }

  loadCatalog() {
    this.http.get<{ data: CatalogService[] }>(`${this.apiUrl}/catalog/services?limit=100`)
      .pipe(take(1), catchError(() => of({ data: [] })))
      .subscribe((res) => this.catalogServices.set(res.data));
  }

  loadDoctors() {
    this.http.get<Doctor[]>(`${this.apiUrl}/users?role=MEDICO`)
      .pipe(take(1), catchError(() => of([])))
      .subscribe((users) => this.doctors.set(users));
  }

  openPlanBuilder() {
    this.planBuilderForm.reset({
      planName: 'Plan de Tratamiento',
      paymentType: 'Al Contado',
      advancePayment: 0,
      installmentsCount: 1,
      frequency: 'Mensual',
      doctorId: 0,
    });
    this.builderItems.set([]);
    this.builderServiceId.set('');
    this.selectedCategoryId.set('');
    this.showPlanBuilderModal.set(true);
  }

  closePlanBuilder() { this.showPlanBuilderModal.set(false); }

  onCategoryChange(event: Event, serviceSelect: HTMLSelectElement) {
    const catId = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(catId);
    this.builderServiceId.set('');
    serviceSelect.value = '';
  }

  addServiceToBuilder(event: Event, serviceSelect: HTMLSelectElement) {
    const serviceId = serviceSelect.value;
    const svc = this.availableServices().find((s) => s.id === serviceId);
    if (!svc) return;

    this.builderItems.update((items) => [...items, {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      serviceId: svc.id,
      serviceName: svc.name,
      price: svc.basePrice,
    }]);

    this.builderServiceId.set('');
    serviceSelect.value = '';
  }

  removeServiceFromBuilder(id: string) {
    this.builderItems.update((items) => items.filter((i) => i.id !== id));
  }

  saveTreatmentPlan() {
    if (this.planBuilderForm.invalid) { this.planBuilderForm.markAllAsTouched(); return; }
    if (this.builderItems().length === 0) { this.toast.error('Agrega al menos un servicio'); return; }

    const patientIdNum = Number(this.patientId());
    if (!patientIdNum) { this.toast.error('Paciente no encontrado'); return; }

    this.saving.set(true);
    const { planName, paymentType, doctorId } = this.formValue();
    const medicoIdNum = Number(doctorId);

    const servicios = this.builderItems().map((item) => ({
      servicioId: Number(item.serviceId),
      cantidad: 1,
      descuento: 0,
    }));

    this.http.post(`${this.apiUrl}/treatment-plans`, {
      pacienteId: patientIdNum,
      medicoId: medicoIdNum,
      servicios,
      observaciones: planName,
    }).pipe(take(1), catchError((err) => {
      this.saving.set(false);
      this.toast.error(err?.error?.message || 'Error al guardar');
      return of(null);
    })).subscribe((result: any) => {
      this.saving.set(false);
      if (result) {
        const mappedItems: TreatmentPlanItem[] = (result.servicios || []).map((s: any) => ({
          id: String(s.id),
          serviceId: s.servicio?.id ? String(s.servicio.id) : undefined,
          serviceName: s.servicio?.nombreServicio || 'Servicio',
          price: Number(s.servicio?.precioActual || s.servicio?.precio || 0),
          ejecutado: false,
        }));

        const newPlan: TreatmentPlan = {
          id: String(result.id),
          name: planName,
          date: new Date().toLocaleDateString('es-PE'),
          doctorId: result.medicoId ? String(result.medicoId) : undefined,
          items: mappedItems.length > 0 ? mappedItems : this.builderItems().map(item => ({ ...item, ejecutado: false })),
          totalCost: this.builderSubtotal(),
          paymentType,
          installments: paymentType === 'A Cuotas' ? this.generatedInstallments() : undefined,
        };
        this.planAdded.emit(newPlan);
        this.toast.success('Plan guardado');
        this.closePlanBuilder();
      }
    });
  }

  toggleServiceExecution(plan: TreatmentPlan, item: TreatmentPlanItem) {
    this.http.put(`${this.apiUrl}/treatment-plans/services/${item.id}/toggle-execution`, {})
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          item.ejecutado = res.ejecutado;
          this.toast.success(res.ejecutado ? 'Servicio completado' : 'Servicio pendiente');
        },
        error: () => {
          this.toast.error('No se pudo actualizar el estado del servicio');
        }
      });
  }

  scheduleAppointment(plan: TreatmentPlan, item: TreatmentPlanItem) {
    this.appointmentPrefill.set({
      patientId: this.patientId(),
      dentistId: plan.doctorId ?? '',
      reason: item.serviceName,
      planServicioId: item.id,
      serviceId: item.serviceId ?? '',
    });
    this.showAppointmentModal.set(true);
  }

  closeAppointmentModal() {
    this.showAppointmentModal.set(false);
    this.appointmentPrefill.set(null);
  }

  onAppointmentSaved() {
    this.closeAppointmentModal();
    this.toast.success('Cita agendada correctamente.');
  }

  editPlan(plan: TreatmentPlan) {
    this.editingPlan.set(plan);
    this.editPlanForm.reset({
      planName: plan.name,
      estado: plan.estado || 'Activo',
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingPlan.set(null);
  }

  updatePlan() {
    if (this.editPlanForm.invalid) {
      this.editPlanForm.markAllAsTouched();
      return;
    }
    const plan = this.editingPlan();
    if (!plan) return;

    const { planName, estado } = this.editPlanForm.value;

    this.http.put(`${this.apiUrl}/treatment-plans/${plan.id}`, {
      observaciones: planName,
      estado,
    }).pipe(take(1), catchError((err) => {
      this.toast.error(err?.error?.message || 'Error al actualizar el plan');
      return of(null);
    })).subscribe((res) => {
      if (res) {
        this.toast.success('Plan actualizado correctamente');
        this.closeEditModal();
        this.reloadPlans.emit();
      }
    });
  }

  deletePlan(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan de tratamiento?')) {
      return;
    }

    this.http.delete(`${this.apiUrl}/treatment-plans/${id}`)
      .pipe(take(1), catchError((err) => {
        this.toast.error(err?.error?.message || 'Error al eliminar el plan');
        return of(null);
      })).subscribe((res) => {
        if (res) {
          this.toast.success('Plan de tratamiento eliminado');
          this.reloadPlans.emit();
        }
      });
  }
}
