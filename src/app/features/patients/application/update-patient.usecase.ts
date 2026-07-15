import { inject, Injectable } from '@angular/core';

import { UpdatePatientRequest } from '../domain/patient';
import { PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class UpdatePatientUseCase {
  private readonly repository = inject(PatientRepository);

  execute(id: string, data: UpdatePatientRequest) {
    return this.repository.update(id, data);
  }
}
