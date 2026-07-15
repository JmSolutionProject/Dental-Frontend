import { inject, Injectable } from '@angular/core';

import { FindAllParams } from '../domain/patient.repository';
import { PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class GetPatientsUseCase {
  private readonly repository = inject(PatientRepository);

  execute(params?: FindAllParams) {
    return this.repository.findAll(params);
  }
}
