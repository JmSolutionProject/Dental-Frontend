import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';
import { LinkDiagnosisRequest } from '../domain/treatment-plan';

@Injectable({ providedIn: 'root' })
export class LinkDiagnosisUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(planId: string, data: LinkDiagnosisRequest) {
    return this.repository.linkDiagnosis(planId, data);
  }
}
