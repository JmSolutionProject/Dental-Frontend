import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstallmentRecord, TreatmentPlan, TreatmentPlanItem } from '../../domain/patient';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';

@Component({
  selector: 'app-patient-treatment-plan-tab',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, FormField],
  templateUrl: './patient-treatment-plan-tab.html',
  styleUrl: './patient-treatment-plan-tab.css'
})
export class PatientTreatmentPlanTab {
  treatmentPlans = input.required<TreatmentPlan[]>();
  planAdded = output<TreatmentPlan>();

  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly showPlanBuilderModal = signal(false);

  readonly availableServices = [
    { id: 's1', name: 'Consulta Inicial Diagnóstico', basePrice: 50 },
    { id: 's2', name: 'Limpieza e Higiene Profunda Ultrasónica', basePrice: 120 },
    { id: 's3', name: 'Curación con Resina Simple', basePrice: 80 },
    { id: 's4', name: 'Curación con Resina Compleja', basePrice: 150 },
    { id: 's5', name: 'Extracción Simple', basePrice: 100 },
    { id: 's6', name: 'Extracción Compleja (Cirugía)', basePrice: 350 },
    { id: 's7', name: 'Endodoncia Unirradicular', basePrice: 450 },
    { id: 's8', name: 'Endodoncia Multirradicular', basePrice: 600 },
    { id: 's9', name: 'Corona Porcelana Zirconio', basePrice: 850 },
    { id: 's10', name: 'Implante Dental de Titanio', basePrice: 2500 },
  ];

  readonly planBuilderForm: FormGroup = this.fb.group({
    planName: ['Plan de Tratamiento Integral', Validators.required],
    paymentType: ['Al Contado', Validators.required],
    initialPayment: [0, [Validators.min(0)]],
    installmentsCount: [1, [Validators.min(1), Validators.max(24)]],
    frequency: ['Mensual'],
  });

  readonly builderItems = signal<TreatmentPlanItem[]>([]);
  readonly builderServiceId = signal<string>('');
  
  readonly builderTotalCost = computed(() => {
    return this.builderItems().reduce((sum, item) => sum + item.price, 0);
  });

  readonly generatedInstallments = computed<InstallmentRecord[]>(() => {
    const paymentType = this.planBuilderForm.get('paymentType')?.value;
    if (paymentType !== 'A Cuotas') return [];
    
    const initialPayment = this.planBuilderForm.get('initialPayment')?.value || 0;
    const count = this.planBuilderForm.get('installmentsCount')?.value || 1;
    const freq = this.planBuilderForm.get('frequency')?.value || 'Mensual';
    const total = this.builderTotalCost();
    
    if (initialPayment > total) return [];
    
    const remainingToFinance = total - initialPayment;
    const amountPerInstallment = remainingToFinance / count;
    
    const generated: InstallmentRecord[] = [];
    if (initialPayment > 0) {
      generated.push({
        id: 'initial', date: new Date().toLocaleDateString('es-PE'), amount: initialPayment, status: 'Pendiente'
      });
    }
    
    let currentDate = new Date();
    for (let i = 1; i <= count; i++) {
      if (freq === 'Quincenal') currentDate.setDate(currentDate.getDate() + 15);
      else currentDate.setMonth(currentDate.getMonth() + 1);
      
      generated.push({
        id: `inst-${i}`, date: currentDate.toLocaleDateString('es-PE'), amount: Number(amountPerInstallment.toFixed(2)), status: 'Pendiente'
      });
    }
    return generated;
  });

  constructor() {
    this.planBuilderForm.valueChanges.subscribe(() => {
      this.builderItems.set([...this.builderItems()]);
    });
  }

  openPlanBuilder() {
    this.planBuilderForm.reset({
      planName: 'Plan de Tratamiento Integral',
      paymentType: 'Al Contado',
      initialPayment: 0,
      installmentsCount: 1,
      frequency: 'Mensual'
    });
    this.builderItems.set([]);
    this.builderServiceId.set('');
    this.showPlanBuilderModal.set(true);
  }

  closePlanBuilder() {
    this.showPlanBuilderModal.set(false);
  }

  addServiceToBuilder(selectEvent: Event) {
    const serviceId = (selectEvent.target as HTMLSelectElement).value;
    const service = this.availableServices.find(s => s.id === serviceId);
    if (!service) return;

    const newItem: TreatmentPlanItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      serviceName: service.name,
      price: service.basePrice,
    };

    this.builderItems.update(items => [...items, newItem]);
    this.builderServiceId.set(''); 
  }

  removeServiceFromBuilder(id: string) {
    this.builderItems.update(items => items.filter(i => i.id !== id));
  }

  saveTreatmentPlan() {
    if (this.planBuilderForm.invalid) {
      this.planBuilderForm.markAllAsTouched();
      return;
    }

    if (this.builderItems().length === 0) {
      this.toast.error('Debe agregar al menos un servicio al plan.');
      return;
    }

    const { planName, paymentType } = this.planBuilderForm.getRawValue();

    const newPlan: TreatmentPlan = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: planName,
      date: new Date().toLocaleDateString('es-PE'),
      items: this.builderItems(),
      totalCost: this.builderTotalCost(),
      paymentType,
      installments: paymentType === 'A Cuotas' ? this.generatedInstallments() : undefined,
    };

    this.planAdded.emit(newPlan);
    this.toast.success('¡Plan de tratamiento guardado exitosamente!');
    this.closePlanBuilder();
  }
}
