import { Component, input, signal } from '@angular/core';
import { Patient, SystemMedicalAlert } from '../../domain/patient';

@Component({
  selector: 'app-patient-summary-tab',
  standalone: true,
  imports: [],
  templateUrl: './patient-summary-tab.html',
  styleUrl: './patient-summary-tab.css',
})
export class PatientSummaryTab {
  patient = input.required<Patient>();
  systemMedicalAlerts = input<SystemMedicalAlert[]>([]);
  budgetPending = input<number>(0);
  budgetTotal = input<number>(0);
  nextAppointmentDate = input<string>('');
  assignedDoctor = input<string>('');
  lastVisitDate = input<string>('');

  readonly isExpanded = signal<boolean>(false);

  toggleExpand() {
    this.isExpanded.update((v) => !v);
  }

  get hasCriticalAlerts(): boolean {
    return this.systemMedicalAlerts().some((a) => a.level === 'CRÍTICO');
  }
}
