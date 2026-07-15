import { Injectable } from '@angular/core';

import { TreatmentPhase, calculatePlanTotal } from '../domain/treatment-plan';

/**
 * Pure domain use case that calculates the total cost for a treatment plan.
 * Works without a repository — just sums procedure costs across phases.
 */
@Injectable({ providedIn: 'root' })
export class CalculateCostUseCase {
  execute(phases: TreatmentPhase[]): number {
    return calculatePlanTotal(phases);
  }
}
