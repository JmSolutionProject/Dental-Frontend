import { inject, Injectable } from '@angular/core';

import { CreatePatientRequest } from '../domain/patient';
import { PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class CreatePatientUseCase {
  private readonly repository = inject(PatientRepository);

  execute(patient: CreatePatientRequest) {
    return this.repository.create(patient);
  }
}
