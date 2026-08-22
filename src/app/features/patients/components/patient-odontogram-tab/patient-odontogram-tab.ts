import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, computed } from '@angular/core';
import {
  FdiTooth,
  Odontogram,
  ToothCondition,
  ToothSurface,
  ToothSurfaceSelection,
  ALL_CONDITIONS,
  toothConditionLabel,
  toothSurfaceLabel,
  FDI_ADULT_TEETH,
  FDI_CHILD_TEETH,
  fdiTeethForQuadrant,
  fdiToGridPosition,
} from '../../../odontogram/domain/odontogram';
import { GetOdontogramUseCase } from '../../../odontogram/application/get-odontogram.usecase';
import { UpdateToothConditionUseCase } from '../../../odontogram/application/update-tooth-condition.usecase';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { catchError, finalize, of, switchMap, take } from 'rxjs';
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
  private readonly auth = inject(AuthService);

  readonly odontogram = signal<Odontogram | null>(null);
  readonly loadingOdontogram = signal(false);
  readonly selectedTooth = signal<FdiTooth | null>(null);
  readonly selectedSurface = signal<ToothSurface | null>(null);
  readonly savingTooth = signal(false);
  readonly quadrant = signal<'adult' | 'child'>('adult');
  readonly conditionOptions = ALL_CONDITIONS;
  readonly showToothProgressModal = signal(false);
  readonly progressNotes = signal('');
  readonly selectedCondition = signal<ToothCondition>('healthy');
  readonly showToothDetailsModal = signal(false);
  readonly viewingTooth = signal<FdiTooth | null>(null);

  readonly canEditOdontogram = computed(() => {
    const roles = this.auth.roles();
    return roles.includes('dentist') || roles.includes('admin');
  });

  readonly toothCards = computed(() => {
    const odo = this.odontogram();
    if (!odo) return [];
    return odo.teeth
      .filter(
        (t) =>
          t.condition !== 'healthy' ||
          Boolean(t.notes && t.notes.trim().length > 0),
      )
      .map((t) => ({
        ...t,
        conditionLabel: toothConditionLabel(t.condition),
      }));
  });

  readonly positionedTeeth = computed(() => {
    const odo = this.odontogram();
    const toothMap = new Map<number, FdiTooth>();
    for (const tooth of odo?.teeth ?? []) {
      toothMap.set(tooth.fdiNumber, tooth);
    }

    return fdiTeethForQuadrant(this.quadrant())
      .map((fdi) => {
        const position = fdiToGridPosition(fdi);
        if (!position) return null;

        const tooth = toothMap.get(fdi) ?? ({ fdiNumber: fdi, condition: 'healthy' } as FdiTooth);
        return { tooth, row: position.row, col: position.col };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  });

  readonly upperTeeth = computed(() => this.positionedTeeth().filter((item) => item.row === 0));
  readonly lowerTeeth = computed(() => this.positionedTeeth().filter((item) => item.row === 1));

  readonly gridCols = computed(() => {
    return this.quadrant() === 'adult' ? 16 : 10;
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
        catchError(() => of(null)),
        finalize(() => this.loadingOdontogram.set(false)),
      )
      .subscribe((data) => {
        const odontogramData = data ?? this.createLocalOdontogram(id, this.quadrant());
        this.odontogram.set(this.completeLocalOdontogram(id, odontogramData));
        this.quadrant.set(odontogramData.quadrant);
      });
  }

  private createLocalOdontogram(patientId: string, quadrant: 'adult' | 'child'): Odontogram {
    return {
      patientId,
      quadrant,
      teeth: fdiTeethForQuadrant(quadrant).map((fdiNumber) => ({
        fdiNumber,
        condition: 'healthy',
        notes: '',
      })),
    };
  }

  private completeLocalOdontogram(patientId: string, odontogram: Odontogram): Odontogram {
    const quadrant = odontogram.quadrant;
    const requiredFdi = fdiTeethForQuadrant(quadrant);
    const existingTeeth = new Map<number, FdiTooth>();

    for (const tooth of odontogram.teeth) {
      existingTeeth.set(tooth.fdiNumber, tooth);
    }

    return {
      patientId,
      quadrant,
      teeth: requiredFdi.map(
        (fdiNumber) => existingTeeth.get(fdiNumber) ?? ({ fdiNumber, condition: 'healthy', notes: '' } as FdiTooth),
      ),
    };
  }

  selectTooth(tooth: FdiTooth) {
    if (!this.canEditOdontogram() || this.savingTooth()) return;
    this.selectedTooth.set(tooth);
    this.selectedSurface.set(null);
    this.selectedCondition.set(tooth.condition);
    this.progressNotes.set('');
    this.showToothProgressModal.set(true);
  }

  selectSurface(selection: ToothSurfaceSelection) {
    if (!this.canEditOdontogram()) return;

    const tooth = this.positionedTeeth().find((item) => item.tooth.fdiNumber === selection.fdiNumber)?.tooth;
    if (!tooth) return;

    this.selectedTooth.set(tooth);
    this.selectedSurface.set(selection.surface);
    this.selectedCondition.set(tooth.surfaceConditions?.[selection.surface] ?? tooth.condition);
    this.progressNotes.set('');
    this.showToothProgressModal.set(true);
  }

  closeToothProgressModal() {
    this.showToothProgressModal.set(false);
    this.selectedTooth.set(null);
    this.selectedSurface.set(null);
  }

  viewToothDetails(card: FdiTooth) {
    this.viewingTooth.set(card);
    this.showToothDetailsModal.set(true);
  }

  closeToothDetailsModal() {
    this.showToothDetailsModal.set(false);
    this.viewingTooth.set(null);
  }

  selectCondition(condition: ToothCondition) {
    this.selectedCondition.set(condition);
  }

  currentSelectedCondition(): ToothCondition {
    const tooth = this.selectedTooth();
    const surface = this.selectedSurface();

    if (!tooth) return 'healthy';
    return surface ? tooth.surfaceConditions?.[surface] ?? tooth.condition : tooth.condition;
  }

  saveToothProgress() {
    this.applyCondition(this.selectedCondition());
  }

  applyCondition(condition: ToothCondition) {
    const tooth = this.selectedTooth();
    const pid = this.patientId();
    if (!tooth || !pid) return;

    const newHistoryRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      date: new Date().toLocaleDateString('es-PE'),
      condition,
      surface: this.selectedSurface() ?? undefined,
      notes: this.progressNotes(),
    };

    const updatedTooth: FdiTooth = { 
      ...tooth, 
      condition, 
      surface: this.selectedSurface() ?? undefined,
      surfaceConditions: this.selectedSurface()
        ? { ...tooth.surfaceConditions, [this.selectedSurface() as ToothSurface]: condition }
        : tooth.surfaceConditions,
      notes: this.progressNotes(),
      history: [...(tooth.history || []), newHistoryRecord]
    };

    this.savingTooth.set(true);

    this.updateToothCondition
      .execute(pid, updatedTooth)
      .pipe(
        take(1),
        switchMap(() => this.getOdontogram.execute(pid).pipe(take(1))),
        catchError((err) => {
          console.error('Error al guardar odontograma:', err);
          this.toast.error(this.getBackendErrorMessage(err));
          return of(null);
        }),
        finalize(() => this.savingTooth.set(false)),
      )
      .subscribe((persistedOdontogram) => {
        if (!persistedOdontogram) return;

        const completedOdontogram = this.completeLocalOdontogram(pid, persistedOdontogram);
        const persistedTooth = completedOdontogram.teeth.find(
          (t) => t.fdiNumber === tooth.fdiNumber,
        );
        const surface = this.selectedSurface();
        const persistedCondition = surface
          ? persistedTooth?.surfaceConditions?.[surface]
          : persistedTooth?.condition;

        if (!persistedTooth || persistedCondition !== condition) {
          this.toast.error('El backend no devolvió el tratamiento guardado. Revisa si el endpoint está persistiendo en la DB.');
          return;
        }

        this.odontogram.set(completedOdontogram);
        this.toast.success(
          `Pieza dental ${tooth.fdiNumber} marcada como: ${this.conditionLabel(condition)}.`,
        );
        this.closeToothProgressModal();
        this.progressNotes.set('');
      });
  }

  private mergeTooth(tooth: FdiTooth) {
    const current = this.odontogram();
    const patientId = this.patientId();
    if (!current || !patientId) return;

    this.odontogram.set({
      ...current,
      teeth: current.teeth.map((item) =>
        item.fdiNumber === tooth.fdiNumber ? { ...item, ...tooth } : item,
      ),
    });
  }

  private getBackendErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const message = err.error?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (message) return message;
    }

    if (err instanceof Error && err.message) return err.message;

    return 'Error al actualizar la pieza dental.';
  }

  setQuadrant(q: 'adult' | 'child') {
    this.quadrant.set(q);
    this.selectedTooth.set(null);
    this.selectedSurface.set(null);
  }

  conditionLabel(condition: ToothCondition): string {
    return toothConditionLabel(condition);
  }

  surfaceLabel(surface: ToothSurface): string {
    return toothSurfaceLabel(surface);
  }

  gridColumnStyle(col: number): string {
    return String(col + 1);
  }

  gridRowStyle(row: number): string {
    return row === 0 ? '1' : '3';
  }

  isSelected(tooth: FdiTooth): boolean {
    return this.selectedTooth()?.fdiNumber === tooth.fdiNumber;
  }
}
