import { inject, Injectable } from '@angular/core';

import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';

@Injectable({ providedIn: 'root' })
export class GetPatientPlansUseCase {
  private readonly repository = inject(TreatmentPlanRepository);

  execute(patientId: string) {
    return this.repository.findByPatientId(patientId);
  }
}
