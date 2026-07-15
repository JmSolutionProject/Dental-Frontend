import { inject, Injectable } from '@angular/core';

import { PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class GetPatientUseCase {
  private readonly repository = inject(PatientRepository);

  execute(id: string) {
    return this.repository.findById(id);
  }
}
