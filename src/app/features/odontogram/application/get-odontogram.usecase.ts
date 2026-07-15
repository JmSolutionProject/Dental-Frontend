import { inject, Injectable } from '@angular/core';

import { OdontogramRepository } from '../domain/odontogram.repository';

@Injectable({ providedIn: 'root' })
export class GetOdontogramUseCase {
  private readonly repository = inject(OdontogramRepository);

  execute(patientId: string) {
    return this.repository.findByPatientId(patientId);
  }
}
