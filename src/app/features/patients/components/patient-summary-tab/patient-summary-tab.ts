import { Component, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroExclamationTriangle,
  heroArrowTrendingUp,
  heroUsers,
  heroCheckCircle,
  heroSquaresPlus,
  heroClipboardDocumentList,
  heroCalendarDays,
  heroClock,
} from '@ng-icons/heroicons/outline';
import { Patient, SystemMedicalAlert } from '../../domain/patient';

@Component({
  selector: 'app-patient-summary-tab',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({
      heroExclamationTriangle,
      heroArrowTrendingUp,
      heroUsers,
      heroCheckCircle,
      heroSquaresPlus,
      heroClipboardDocumentList,
      heroCalendarDays,
      heroClock,
    }),
  ],
  templateUrl: './patient-summary-tab.html',
  styleUrl: './patient-summary-tab.css',
})
export class PatientSummaryTab {
  patient = input.required<Patient>();
  systemMedicalAlerts = input<SystemMedicalAlert[]>([]);
  budgetPending = input<number>(0);
  budgetTotal = input<number>(0);
  isDoctor = input<boolean>(false);
  nextAppointmentDate = input<string>('');
  assignedDoctor = input<string>('');
  lastVisitDate = input<string>('');
  observations = input<string>('');
  totalAppointments = input<number>(0);
  completedAppointments = input<number>(0);
  viewAllObservations = output<void>();

  get latestObservation(): { date: string; doctor: string; text: string } | null {
    const raw = this.observations();
    if (!raw) return null;
    const entries = raw
      .split('\n---\n')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => {
        const [date, doctor, ...rest] = b.split('|');
        return { date: date?.trim() || '', doctor: doctor?.trim() || '', text: rest.join('|').trim() };
      })
      .filter((e) => e.text.length > 0);
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
