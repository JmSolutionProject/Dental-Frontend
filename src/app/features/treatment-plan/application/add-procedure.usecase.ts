import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';
import { AddProcedureRequest } from '../domain/treatment-plan';

@Injectable({ providedIn: 'root' })
export class AddProcedureUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(planId: string, phaseId: string, data: AddProcedureRequest) {
    return this.repository.addProcedure(planId, phaseId, data);
  }
}
