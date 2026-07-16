import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { Patient } from '../../domain/patient';
import { FdiTooth, Odontogram, ToothCondition, ALL_CONDITIONS, toothConditionLabel, FDI_ADULT_TEETH, FDI_CHILD_TEETH } from '../../../odontogram/domain/odontogram';
import { GetOdontogramUseCase } from '../../../odontogram/application/get-odontogram.usecase';
import { UpdateToothConditionUseCase } from '../../../odontogram/application/update-tooth-condition.usecase';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { catchError, finalize, of, take } from 'rxjs';
import { ToothChart } from '../../../../shared/components/tooth-chart/tooth-chart';
import { Modal } from '../../../../shared/components/modal/modal';

@Component({
  selector: 'app-patient-odontogram-tab',
  standalone: true,
  imports: [ToothChart, Modal],
  templateUrl: './patient-odontogram-tab.html',
  styleUrl: './patient-odontogram-tab.css'
})
export class PatientOdontogramTab {
  patientId = input.required<string>();

  private readonly getOdontogram = inject(GetOdontogramUseCase);
  private readonly updateToothCondition = inject(UpdateToothConditionUseCase);
  private readonly toast = inject(ToastService);

  readonly odontogram = signal<Odontogram | null>(null);
  readonly loadingOdontogram = signal(false);
  readonly selectedTooth = signal<FdiTooth | null>(null);
  readonly savingTooth = signal(false);
  readonly quadrant = signal<'adult' | 'child'>('adult');
  readonly conditionOptions = ALL_CONDITIONS;
  readonly showToothProgressModal = signal(false);
  readonly progressNotes = signal('');

  readonly positionedTeeth = computed(() => {
    const odo = this.odontogram();
    if (!odo) return [];
    let teeth = odo.teeth;
    if (this.quadrant() === 'adult') {
      teeth = teeth.filter((t) => FDI_ADULT_TEETH.includes(t.fdiNumber));
    } else {
      teeth = teeth.filter((t) => FDI_CHILD_TEETH.includes(t.fdiNumber));
    }

    teeth.sort((a, b) => a.fdiNumber - b.fdiNumber);
    const topRow = teeth.filter((t) => Math.floor(t.fdiNumber / 10) === 1 || Math.floor(t.fdiNumber / 10) === 2 || Math.floor(t.fdiNumber / 10) === 5 || Math.floor(t.fdiNumber / 10) === 6);
    const bottomRow = teeth.filter((t) => Math.floor(t.fdiNumber / 10) === 3 || Math.floor(t.fdiNumber / 10) === 4 || Math.floor(t.fdiNumber / 10) === 7 || Math.floor(t.fdiNumber / 10) === 8);
    const topQ1 = topRow.filter((t) => Math.floor(t.fdiNumber / 10) === 1 || Math.floor(t.fdiNumber / 10) === 5).sort((a, b) => b.fdiNumber - a.fdiNumber);
    const topQ2 = topRow.filter((t) => Math.floor(t.fdiNumber / 10) === 2 || Math.floor(t.fdiNumber / 10) === 6).sort((a, b) => a.fdiNumber - b.fdiNumber);
    const bottomQ4 = bottomRow.filter((t) => Math.floor(t.fdiNumber / 10) === 4 || Math.floor(t.fdiNumber / 10) === 8).sort((a, b) => b.fdiNumber - a.fdiNumber);
    const bottomQ3 = bottomRow.filter((t) => Math.floor(t.fdiNumber / 10) === 3 || Math.floor(t.fdiNumber / 10) === 7).sort((a, b) => a.fdiNumber - b.fdiNumber);
    
    const isAdult = this.quadrant() === 'adult';
    const topArranged = [...topQ1, ...topQ2];
    const bottomArranged = [...bottomQ4, ...bottomQ3];
    
    const mapped = [];
    for (let i = 0; i < topArranged.length; i++) {
      let colIndex = i;
      if (!isAdult && i >= 5) colIndex = i + 6; 
      mapped.push({ tooth: topArranged[i], col: colIndex });
    }
    for (let i = 0; i < bottomArranged.length; i++) {
      let colIndex = i;
      if (!isAdult && i >= 5) colIndex = i + 6;
      mapped.push({ tooth: bottomArranged[i], col: colIndex });
    }
    return mapped;
  });

  readonly gridCols = computed(() => {
    return this.quadrant() === 'adult' ? 16 : 16;
  });

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) {
        this.loadOdontogram(id);
      }
    });
  }

  private loadOdontogram(id: string) {
    this.loadingOdontogram.set(true);
    this.getOdontogram
      .execute(id)
      .pipe(
        take(1),
        catchError(() => of(this.generateMockOdontogram(id))),
        finalize(() => this.loadingOdontogram.set(false)),
      )
      .subscribe((data) => {
        if (data) {
          this.odontogram.set(data);
          this.quadrant.set(data.quadrant);
        }
      });
  }

  private generateMockOdontogram(id: string): Odontogram {
    const teeth: FdiTooth[] = [...FDI_ADULT_TEETH, ...FDI_CHILD_TEETH].map(num => ({ fdiNumber: num, condition: 'healthy' }));
    const idx = teeth.findIndex(t => t.fdiNumber === 16);
    if (idx !== -1) teeth[idx].condition = 'caries';
    return { patientId: id, quadrant: 'adult', teeth };
  }

  selectTooth(tooth: FdiTooth) {
    if (this.savingTooth()) return;
    this.selectedTooth.set(tooth);
    this.progressNotes.set('');
    this.showToothProgressModal.set(true);
  }

  closeToothProgressModal() {
    this.showToothProgressModal.set(false);
    this.selectedTooth.set(null);
  }

  applyCondition(condition: ToothCondition) {
    const tooth = this.selectedTooth();
    const pid = this.patientId();
    if (!tooth || !pid) return;

    const newHistoryRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      date: new Date().toLocaleDateString('es-PE'),
      condition,
      notes: this.progressNotes(),
    };

    const updatedTooth: FdiTooth = { 
      ...tooth, 
      condition, 
      notes: this.progressNotes(),
      history: [...(tooth.history || []), newHistoryRecord]
    };

    this.savingTooth.set(true);

    this.updateToothCondition
      .execute(pid, updatedTooth)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al actualizar la pieza dental.');
          return of(null);
        }),
        finalize(() => this.savingTooth.set(false)),
      )
      .subscribe((updatedOdontogram) => {
        if (updatedOdontogram) {
          const refreshed = updatedOdontogram.teeth.find(
            (t) => t.fdiNumber === tooth.fdiNumber,
          );
          if (refreshed) {
            refreshed.history = updatedTooth.history;
          }
          this.odontogram.set(updatedOdontogram);
          this.selectedTooth.set(refreshed ?? null);
          this.toast.success(
            `Pieza dental ${tooth.fdiNumber} marcada como: ${this.conditionLabel(condition)}.`,
          );
          this.progressNotes.set('');
        }
      });
  }

  setQuadrant(q: 'adult' | 'child') {
    this.quadrant.set(q);
    this.selectedTooth.set(null);
  }

  conditionLabel(condition: ToothCondition): string {
    return toothConditionLabel(condition);
  }

  gridColumnStyle(col: number): string {
    return String(col + 1);
  }

  isSelected(tooth: FdiTooth): boolean {
    return this.selectedTooth()?.fdiNumber === tooth.fdiNumber;
  }
}
