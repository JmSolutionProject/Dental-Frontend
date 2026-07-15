import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';

@Injectable({ providedIn: 'root' })
export class GetPlanUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(id: string) {
    return this.repository.findById(id);
  }
}
