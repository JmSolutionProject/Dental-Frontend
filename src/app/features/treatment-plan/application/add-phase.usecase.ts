import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';
import { AddPhaseRequest } from '../domain/treatment-plan';

@Injectable({ providedIn: 'root' })
export class AddPhaseUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(planId: string, data: AddPhaseRequest) {
    return this.repository.addPhase(planId, data);
  }
}
