import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take, catchError, of, finalize } from 'rxjs';

import { GetOdontogramUseCase } from '../../application/get-odontogram.usecase';
import { UpdateToothConditionUseCase } from '../../application/update-tooth-condition.usecase';
import {
  FdiTooth,
  fdiTeethForQuadrant,
  fdiToGridPosition,
  ToothCondition,
  toothConditionLabel,
  createDefaultAdultTeeth,
  createDefaultChildTeeth,
  Odontogram,
} from '../../domain/odontogram';
import { ToothChart } from '../../../../shared/components/tooth-chart/tooth-chart';
import { ToastService } from '../../../../shared/components/toast/toast.service';

const ALL_CONDITIONS: ToothCondition[] = [
  'healthy',
  'caries',
  'restoration',
  'extraction',
  'crown',
  'missing',
];

@Component({
  selector: 'app-odontogram-chart',
  imports: [RouterLink, ToothChart],
  templateUrl: './odontogram-chart.html',
  styleUrl: './odontogram-chart.css',
})
export class OdontogramChart {
  private readonly route = inject(ActivatedRoute);
  private readonly getOdontogram = inject(GetOdontogramUseCase);
  private readonly updateToothCondition = inject(UpdateToothConditionUseCase);
  private readonly toast = inject(ToastService);

  readonly patientId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly odontogram = signal<Odontogram | null>(null);
  readonly selectedTooth = signal<FdiTooth | null>(null);
  readonly saving = signal(false);

  readonly quadrant = signal<'adult' | 'child'>('adult');

  readonly teeth = computed<FdiTooth[]>(() => {
    const o = this.odontogram();
    if (o) return o.teeth;
    return this.quadrant() === 'adult'
      ? createDefaultAdultTeeth()
      : createDefaultChildTeeth();
  });

  readonly conditionOptions = ALL_CONDITIONS;

  /**
   * Returns teeth ordered by their grid position for the SVG chart.
   * Each entry includes the FdiTooth plus its computed grid {row, col}.
   */
  readonly positionedTeeth = computed(() => {
    const all = fdiTeethForQuadrant(this.quadrant());
    const toothMap = new Map<number, FdiTooth>();
    for (const t of this.teeth()) {
      toothMap.set(t.fdiNumber, t);
    }

    return all
      .map((fdi) => {
        const pos = fdiToGridPosition(fdi);
        if (!pos) return null;
        const tooth =
          toothMap.get(fdi) ?? ({ fdiNumber: fdi, condition: 'healthy' } as FdiTooth);
        return { tooth, row: pos.row, col: pos.col };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  /** Max columns in the grid — adult=16, child=10. */
  readonly gridCols = computed(() =>
    this.quadrant() === 'adult' ? 16 : 10,
  );

  /** Quadrant labels to display. */
  readonly quadrantLabels = computed(() => {
    if (this.quadrant() === 'adult') {
      return [
        { label: 'Upper Right (1)', range: '18–11' },
        { label: 'Upper Left (2)', range: '21–28' },
        { label: 'Lower Left (3)', range: '31–38' },
        { label: 'Lower Right (4)', range: '48–41' },
      ];
    }
    return [
      { label: 'Upper Right (5)', range: '55–51' },
      { label: 'Upper Left (6)', range: '61–65' },
      { label: 'Lower Left (7)', range: '71–75' },
      { label: 'Lower Right (8)', range: '85–81' },
    ];
  });

  constructor() {
    this.loadOdontogram();
  }

  private loadOdontogram() {
    this.loading.set(true);
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.patientId.set(null);
        this.loading.set(false);
        return;
      }
      this.patientId.set(id);

      this.getOdontogram
        .execute(id)
        .pipe(
          take(1),
          catchError(() => {
            // No existing odontogram — use default teeth set
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        )
        .subscribe((odontogramData) => {
          if (odontogramData) {
            this.odontogram.set(odontogramData);
            this.quadrant.set(odontogramData.quadrant);
          }
          // If null, the computed `teeth` will use default healthy set
        });
    });
  }

  selectTooth(tooth: FdiTooth) {
    if (this.saving()) return;

    if (this.selectedTooth()?.fdiNumber === tooth.fdiNumber) {
      this.selectedTooth.set(null);
    } else {
      this.selectedTooth.set(tooth);
    }
  }

  applyCondition(condition: ToothCondition) {
    const tooth = this.selectedTooth();
    const patient = this.patientId();
    if (!tooth || !patient) return;

    const updatedTooth: FdiTooth = { ...tooth, condition };

    this.saving.set(true);

    this.updateToothCondition
      .execute(patient, updatedTooth)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to update tooth condition.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updatedOdontogram) => {
        if (updatedOdontogram) {
          this.odontogram.set(updatedOdontogram);
          // Update selected tooth reference
          const refreshed = updatedOdontogram.teeth.find(
            (t) => t.fdiNumber === tooth.fdiNumber,
          );
          this.selectedTooth.set(refreshed ?? null);
          this.toast.success(
            `Tooth ${tooth.fdiNumber} updated to ${toothConditionLabel(condition)}.`,
          );
        }
      });
  }

  closeEditor() {
    this.selectedTooth.set(null);
  }

  conditionLabel(condition: ToothCondition): string {
    return toothConditionLabel(condition);
  }

  setQuadrant(q: 'adult' | 'child') {
    this.quadrant.set(q);
    this.selectedTooth.set(null);
  }

  /** Determine grid column style for a tooth position. */
  gridColumnStyle(col: number): string {
    return String(col + 1);
  }

  isSelected(tooth: FdiTooth): boolean {
    return this.selectedTooth()?.fdiNumber === tooth.fdiNumber;
  }
}
