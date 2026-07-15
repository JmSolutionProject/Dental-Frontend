import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';

import { CreatePlanUseCase } from '../../application/create-plan.usecase';
import { GetPlanUseCase } from '../../application/get-plan.usecase';
import { GetPatientPlansUseCase } from '../../application/get-patient-plans.usecase';
import { AddPhaseUseCase } from '../../application/add-phase.usecase';
import { AddProcedureUseCase } from '../../application/add-procedure.usecase';
import { LinkDiagnosisUseCase } from '../../application/link-diagnosis.usecase';
import { UpdatePlanUseCase } from '../../application/update-plan.usecase';
import { CalculateCostUseCase } from '../../application/calculate-cost.usecase';
import {
  TreatmentPlan,
  TreatmentPhase,
  PlanStatus,
  ProcedureStatus,
  ProcedureCategory,
  CatalogItem,
  CATALOG_ITEMS,
  NON_TOOTH_CATALOG_IDS,
  findCatalogItem,
  isValidPlanTransition,
  planStatusLabel,
  procedureStatusLabel,
  procedureCategoryLabel,
} from '../../domain/treatment-plan';
import { ToastService } from '../../../../shared/components/toast/toast.service';

// ---- local UI helpers ------------------------------------------------------

interface EditablePhase {
  name: string;
  description: string;
}

interface EditableProcedure {
  catalogItemId: string;
  toothNumber: number | string;
  notes: string;
}

@Component({
  selector: 'app-plan-editor',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './plan-editor.html',
  styleUrl: './plan-editor.css',
})
export class PlanEditor {
  // ---- dependency injection ------------------------------------------------

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly createPlan = inject(CreatePlanUseCase);
  private readonly getPlan = inject(GetPlanUseCase);
  private readonly getPatientPlans = inject(GetPatientPlansUseCase);
  private readonly addPhase = inject(AddPhaseUseCase);
  private readonly addProcedure = inject(AddProcedureUseCase);
  private readonly linkDiagnosis = inject(LinkDiagnosisUseCase);
  private readonly updatePlan = inject(UpdatePlanUseCase);
  private readonly calcCost = inject(CalculateCostUseCase);
  private readonly toast = inject(ToastService);

  // ---- mode ----------------------------------------------------------------

  readonly patientId = signal<string | null>(null);
  readonly planId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editMode = computed(() => this.planId() !== null);

  // ---- plan list state -----------------------------------------------------

  readonly plans = signal<TreatmentPlan[]>([]);

  // ---- editor state --------------------------------------------------------

  readonly plan = signal<TreatmentPlan | null>(null);

  // Phase editing
  readonly newPhaseName = signal('');
  readonly newPhaseDescription = signal('');
  readonly expandedPhaseId = signal<string | null>(null);

  // Procedure adding
  readonly selectedCatalogId = signal('');
  readonly newProcTooth = signal('');
  readonly newProcNotes = signal('');

  // Plan-level status input
  readonly targetStatus = signal<PlanStatus | null>(null);

  // ---- catalogue-derived data ----------------------------------------------

  readonly catalog = signal<CatalogItem[]>(CATALOG_ITEMS);
  readonly catalogSearch = signal('');
  readonly filteredCatalog = computed(() => {
    const query = this.catalogSearch().toLowerCase();
    if (!query) return this.catalog();
    return this.catalog().filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query),
    );
  });

  /** Grouped catalogue for display. */
  readonly catalogByCategory = computed(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of this.filteredCatalog()) {
      const key = procedureCategoryLabel(item.category);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  });

  // ---- computed totals -----------------------------------------------------

  readonly totalCost = computed(() => {
    const p = this.plan();
    return p ? this.calcCost.execute(p.phases) : 0;
  });

  // ---- available status transitions ----------------------------------------

  readonly availableTransitions = computed((): PlanStatus[] => {
    const current = this.plan()?.status ?? 'proposed';
    return [...(isValidPlanTransition(current, 'in-progress') ? ['in-progress' as PlanStatus] : []),
            ...(isValidPlanTransition(current, 'completed') ? ['completed' as PlanStatus] : []),
            ...(isValidPlanTransition(current, 'cancelled') ? ['cancelled' as PlanStatus] : []),
            ...(isValidPlanTransition(current, 'proposed') ? ['proposed' as PlanStatus] : []),
    ];
  });

  // ---- lifecycle -----------------------------------------------------------

  constructor() {
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const pId = params.get('id');
      const plId = params.get('planId');
      this.patientId.set(pId ?? null);
      this.planId.set(plId ?? null);

      if (plId) {
        this.loadPlan(plId);
      } else if (pId) {
        this.loadPlans(pId);
      } else {
        this.loading.set(false);
        this.toast.error('No patient ID in route.');
      }
    });
  }

  // ---- data loading --------------------------------------------------------

  private loadPlans(patientId: string) {
    this.loading.set(true);
    this.getPatientPlans
      .execute(patientId)
      .pipe(
        take(1),
        catchError(() => of([] as TreatmentPlan[])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((list) => this.plans.set(list));
  }

  private loadPlan(planId: string) {
    this.loading.set(true);
    this.getPlan
      .execute(planId)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to load treatment plan.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((p) => {
        if (p) {
          this.plan.set(p);
          // Also load the plan list in background for navigation
          if (p.patientId) this.plans.set([p]);
        }
      });
  }

  // ---- plan creation -------------------------------------------------------

  createNewPlan() {
    const pId = this.patientId();
    if (!pId) {
      this.toast.error('No patient selected.');
      return;
    }
    this.saving.set(true);
    this.createPlan
      .execute({ patientId: pId })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to create treatment plan.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((newPlan) => {
        if (newPlan) {
          this.toast.success('Treatment plan created.');
          this.router.navigate(['patients', pId, 'treatment-plans', newPlan.id]);
        }
      });
  }

  // ---- phase management ----------------------------------------------------

  addNewPhase() {
    const pl = this.plan();
    const name = this.newPhaseName().trim();
    if (!pl || !name) return;

    this.saving.set(true);
    this.addPhase
      .execute(pl.id, { name, description: this.newPhaseDescription().trim() })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to add phase.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.plan.set(updated);
          this.newPhaseName.set('');
          this.newPhaseDescription.set('');
          this.toast.success(`Phase "${name}" added.`);
        }
      });
  }

  togglePhase(phaseId: string) {
    this.expandedPhaseId.set(
      this.expandedPhaseId() === phaseId ? null : phaseId,
    );
  }

  // ---- procedure management ------------------------------------------------

  addProcedureToPhase(phaseId: string) {
    const pl = this.plan();
    const catId = this.selectedCatalogId();
    if (!pl || !catId) {
      this.toast.error('Select a procedure from the catalogue.');
      return;
    }

    const catalogItem = findCatalogItem(catId);
    const toothRaw = this.newProcTooth().trim();
    let toothNumber: number | null = null;
    if (toothRaw) {
      const n = Number(toothRaw);
      if (isNaN(n) || n <= 0) {
        this.toast.error('Invalid tooth number.');
        return;
      }
      toothNumber = n;
    }

    this.saving.set(true);
    this.addProcedure
      .execute(pl.id, phaseId, {
        toothNumber,
        catalogItemId: catId,
        cost: catalogItem?.defaultCost,
        notes: this.newProcNotes().trim() || undefined,
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to add procedure.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.plan.set(updated);
          this.selectedCatalogId.set('');
          this.newProcTooth.set('');
          this.newProcNotes.set('');
          this.toast.success('Procedure added.');
        }
      });
  }

  removeProcedure(phaseId: string, procId: string) {
    // Simplified: use update endpoint to mark as cancelled
    // Full remove would need a dedicated use case wired to API
    this.toast.info('Use the API directly to remove procedures.');
  }

  // ---- status transitions --------------------------------------------------

  changePlanStatus(newStatus: PlanStatus) {
    const pl = this.plan();
    if (!pl) return;

    const current = pl.status;
    if (!isValidPlanTransition(current, newStatus)) {
      this.toast.error(
        `Cannot transition from "${planStatusLabel(current)}" to "${planStatusLabel(newStatus)}".`,
      );
      return;
    }

    this.saving.set(true);
    this.updatePlan
      .execute(pl.id, { status: newStatus } as Partial<TreatmentPlan>)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Failed to update plan status.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((updated) => {
        if (updated) {
          this.plan.set(updated);
          this.toast.success(
            `Plan status changed to "${planStatusLabel(newStatus)}".`,
          );
        }
      });
  }

  // ---- navigation ----------------------------------------------------------

  viewPlan(plan: TreatmentPlan) {
    const pId = this.patientId();
    if (!pId) return;
    this.router.navigate(['patients', pId, 'treatment-plans', plan.id]);
  }

  backToList() {
    const pId = this.patientId();
    if (pId) {
      this.router.navigate(['patients', pId, 'treatment-plans']);
    }
  }

  // ---- helpers -------------------------------------------------------------

  getCatalogItemName(id: string): string {
    return findCatalogItem(id)?.name ?? id;
  }

  isNonToothCatalog(id: string): boolean {
    return NON_TOOTH_CATALOG_IDS.has(id);
  }

  phaseProcCount(phase: TreatmentPhase): number {
    return phase.procedures.length;
  }

  phaseTotalCost(phase: TreatmentPhase): number {
    return phase.procedures.reduce((sum, p) => sum + p.cost, 0);
  }

  planStatusLabel(s: PlanStatus): string {
    return planStatusLabel(s);
  }

  procStatusLabel(s: ProcedureStatus): string {
    return procedureStatusLabel(s);
  }

  catLabel(cat: ProcedureCategory | string): string {
    return procedureCategoryLabel(cat as ProcedureCategory);
  }

  canAddPhase(): boolean {
    const pl = this.plan();
    if (!pl) return false;
    return pl.status !== 'completed' && pl.status !== 'cancelled';
  }

  canAddProcedure(): boolean {
    const pl = this.plan();
    if (!pl) return false;
    return pl.status === 'proposed' || pl.status === 'in-progress';
  }

  hasDiagnostics(): boolean {
    return (this.plan()?.diagnostics?.length ?? 0) > 0;
  }
}
