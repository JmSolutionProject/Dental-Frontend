import { Component, input } from '@angular/core';
import { Patient, SystemMedicalAlert } from '../../domain/patient';


@Component({
  selector: 'app-patient-summary-tab',
  standalone: true,
  imports: [],
  templateUrl: './patient-summary-tab.html',
  styleUrl: './patient-summary-tab.css'
})
export class PatientSummaryTab {
  patient = input.required<Patient>();
  systemMedicalAlerts = input<SystemMedicalAlert[]>([]);
  budgetPending = input<number>(0);
  budgetTotal = input<number>(0);
  nextAppointmentDate = input<string>('');
  assignedDoctor = input<string>('');
  lastVisitDate = input<string>('');
}
