import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ALLERGY_OPTIONS,
  DENTAL_HISTORY_OPTIONS,
  DISEASE_OPTIONS,
  MedicalHistory,
  SPECIAL_CONDITION_OPTIONS,
} from '../../domain/patient';

export interface MedicalHistoryData {
  allergies: string[];
  diseases: string[];
  specialConditions: string[];
  dentalHistory: string[];
  takesMedication: boolean;
}

@Component({
  selector: 'app-patient-medical-history-tab',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './patient-medical-history-tab.html',
  styleUrl: './patient-medical-history-tab.css',
})
export class PatientMedicalHistoryTab {
  parentForm = input.required<FormGroup>();
  medicalHistory = input<MedicalHistory>();
  saving = input<boolean>(false);
  saveRequested = output<void>();
  dataChanged = output<MedicalHistoryData>();

  readonly allergyOptionsList = ALLERGY_OPTIONS;
  readonly diseaseOptionsList = DISEASE_OPTIONS;
  readonly specialConditionOptionsList = SPECIAL_CONDITION_OPTIONS;
  readonly dentalHistoryOptionsList = DENTAL_HISTORY_OPTIONS;

  readonly selectedAllergies = signal<string[]>([]);
  readonly selectedDiseases = signal<string[]>([]);
  readonly selectedSpecialConditions = signal<string[]>([]);
  readonly selectedDentalHistory = signal<string[]>([]);
  readonly takesMedication = signal<boolean>(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(
      () => {
        const mh = this.medicalHistory();
        if (mh) {
          const rawAllergies = mh.allergies || [];
          const rawDiseases = mh.conditions || [];
          const rawSpecials = mh.specialConditions || [];
          const rawDental = mh.dentalHistory || [];

          this.selectedAllergies.set(rawAllergies);
          this.selectedDiseases.set(rawDiseases);
          this.selectedSpecialConditions.set(rawSpecials);
          this.selectedDentalHistory.set(rawDental);
          this.takesMedication.set((mh.medications && mh.medications.length > 0) || false);

          const customAllergies = rawAllergies.filter((a) => a && !this.allergyOptionsList.includes(a as any));
          const customDiseases = rawDiseases.filter((d) => d && !this.diseaseOptionsList.includes(d as any));

          const form = this.parentForm();
          if (form) {
            form.get('customAllergy')?.patchValue(customAllergies.join(', '), { emitEvent: false });
            form.get('customDisease')?.patchValue(customDiseases.join(', '), { emitEvent: false });
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    const form = this.parentForm();
    if (!form) return;

    form.get('customAllergy')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.emitCurrentData();
      });

    form.get('customDisease')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.emitCurrentData();
      });
  }

  private emitCurrentData() {
    const form = this.parentForm();
    const customAllergy = (form?.get('customAllergy')?.value || '').trim();
    const customDisease = (form?.get('customDisease')?.value || '').trim();

    // 1. Filter selectedAllergies to keep only options from the pre-defined list
    let allergies = this.selectedAllergies().filter(
      (a: string) => this.allergyOptionsList.includes(a as any)
    );
    // 2. Add current custom allergy text parts
    if (customAllergy) {
      const parts = customAllergy.split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!allergies.includes(p)) {
          allergies.push(p);
        }
      }
    }
    allergies = allergies.filter((a: string) => a && a !== 'Ninguna' && a !== 'Ninguno');

    // 3. Filter selectedDiseases to keep only options from the pre-defined list
    let diseases = this.selectedDiseases().filter(
      (d: string) => this.diseaseOptionsList.includes(d as any)
    );
    // 4. Add current custom disease text parts
    if (customDisease) {
      const parts = customDisease.split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!diseases.includes(p)) {
          diseases.push(p);
        }
      }
    }
    diseases = diseases.filter((d: string) => d && d !== 'Ninguna' && d !== 'Ninguno');

    this.dataChanged.emit({
      allergies,
      diseases,
      specialConditions: this.selectedSpecialConditions().filter((s: string) => s && s !== 'Ninguna' && s !== 'Ninguno'),
      dentalHistory: this.selectedDentalHistory().filter((i: string) => i && i !== 'Ninguno'),
      takesMedication: this.takesMedication(),
    });
  }

  toggleAllergy(allergy: string) {
    const current = this.selectedAllergies();
    if (current.includes(allergy)) {
      this.selectedAllergies.set(current.filter((a: string) => a !== allergy));
    } else {
      this.selectedAllergies.set([...current, allergy]);
    }
    this.emitCurrentData();
  }

  toggleDisease(disease: string) {
    const current = this.selectedDiseases();
    if (disease === 'Ninguna') {
      this.selectedDiseases.set(['Ninguna']);
    } else {
      const filtered = current.filter((d: string) => d !== 'Ninguna');
      if (filtered.includes(disease)) {
        this.selectedDiseases.set(filtered.filter((d: string) => d !== disease));
      } else {
        this.selectedDiseases.set([...filtered, disease]);
      }
    }
    this.emitCurrentData();
  }

  toggleSpecialCondition(cond: string) {
    const current = this.selectedSpecialConditions();
    if (cond === 'Ninguna') {
      this.selectedSpecialConditions.set(['Ninguna']);
    } else {
      const filtered = current.filter((c: string) => c !== 'Ninguna');
      if (filtered.includes(cond)) {
        this.selectedSpecialConditions.set(filtered.filter((c: string) => c !== cond));
      } else {
        this.selectedSpecialConditions.set([...filtered, cond]);
      }
    }
    this.emitCurrentData();
  }

  toggleDentalHistory(item: string) {
    const current = this.selectedDentalHistory();
    if (item === 'Ninguno') {
      this.selectedDentalHistory.set(['Ninguno']);
    } else {
      const filtered = current.filter((i: string) => i !== 'Ninguno');
      if (filtered.includes(item)) {
        this.selectedDentalHistory.set(filtered.filter((i: string) => i !== item));
      } else {
        this.selectedDentalHistory.set([...filtered, item]);
      }
    }
    this.emitCurrentData();
  }

  setTakesMedication(value: boolean) {
    this.takesMedication.set(value);
    this.emitCurrentData();
  }

  save() {
    this.saveRequested.emit();
  }
}
