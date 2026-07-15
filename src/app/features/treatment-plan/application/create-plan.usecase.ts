import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';
import { CreatePlanRequest } from '../domain/treatment-plan';

@Injectable({ providedIn: 'root' })
export class CreatePlanUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(data: CreatePlanRequest) {
    return this.repository.create(data);
  }
}
