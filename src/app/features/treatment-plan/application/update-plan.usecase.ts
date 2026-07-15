import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';
import { TreatmentPlan } from '../domain/treatment-plan';

@Injectable({ providedIn: 'root' })
export class UpdatePlanUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(id: string, data: Partial<TreatmentPlan>) {
    return this.repository.update(id, data);
  }
}
