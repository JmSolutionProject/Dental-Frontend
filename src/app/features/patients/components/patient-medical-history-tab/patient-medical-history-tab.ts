import { Component, computed, inject, input, output, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ALLERGY_OPTIONS, DENTAL_HISTORY_OPTIONS, DISEASE_OPTIONS, SPECIAL_CONDITION_OPTIONS } from '../../domain/patient';

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
  styleUrl: './patient-medical-history-tab.css'
})
export class PatientMedicalHistoryTab {
  parentForm = input.required<FormGroup>();
  saving = input<boolean>(false);
  saveRequested = output<void>();
  dataChanged = output<MedicalHistoryData>();

  readonly allergyOptionsList = ALLERGY_OPTIONS;
  readonly diseaseOptionsList = DISEASE_OPTIONS;
  readonly specialConditionOptionsList = SPECIAL_CONDITION_OPTIONS;
  readonly dentalHistoryOptionsList = DENTAL_HISTORY_OPTIONS;

  readonly selectedAllergies = signal<string[]>(['Penicilina', 'Látex']);
  readonly selectedDiseases = signal<string[]>(['Diabetes', 'Hipertensión arterial']);
  readonly selectedSpecialConditions = signal<string[]>([]);
  readonly selectedDentalHistory = signal<string[]>(['Bruxismo']);
  readonly takesMedication = signal<boolean>(true);

  constructor() {
    effect(() => {
      this.dataChanged.emit({
        allergies: this.selectedAllergies(),
        diseases: this.selectedDiseases(),
        specialConditions: this.selectedSpecialConditions(),
        dentalHistory: this.selectedDentalHistory(),
        takesMedication: this.takesMedication()
      });
    });
  }

  toggleAllergy(allergy: string) {
    const current = this.selectedAllergies();
    if (current.includes(allergy)) {
      this.selectedAllergies.set(current.filter((a) => a !== allergy));
    } else {
      this.selectedAllergies.set([...current, allergy]);
    }
  }

  toggleDisease(disease: string) {
    const current = this.selectedDiseases();
    if (disease === 'Ninguna') {
      this.selectedDiseases.set(['Ninguna']);
      return;
    }
    const filtered = current.filter((d) => d !== 'Ninguna');
    if (filtered.includes(disease)) {
      this.selectedDiseases.set(filtered.filter((d) => d !== disease));
    } else {
      this.selectedDiseases.set([...filtered, disease]);
    }
  }

  toggleSpecialCondition(cond: string) {
    const current = this.selectedSpecialConditions();
    if (cond === 'Ninguna') {
      this.selectedSpecialConditions.set(['Ninguna']);
      return;
    }
    const filtered = current.filter((c) => c !== 'Ninguna');
    if (filtered.includes(cond)) {
      this.selectedSpecialConditions.set(filtered.filter((c) => c !== cond));
    } else {
      this.selectedSpecialConditions.set([...filtered, cond]);
    }
  }

  toggleDentalHistory(item: string) {
    const current = this.selectedDentalHistory();
    if (item === 'Ninguno') {
      this.selectedDentalHistory.set(['Ninguno']);
      return;
    }
    const filtered = current.filter((i) => i !== 'Ninguno');
    if (filtered.includes(item)) {
      this.selectedDentalHistory.set(filtered.filter((i) => i !== item));
    } else {
      this.selectedDentalHistory.set([...filtered, item]);
    }
  }

  setTakesMedication(value: boolean) {
    this.takesMedication.set(value);
  }

  save() {
    this.saveRequested.emit();
  }
}
