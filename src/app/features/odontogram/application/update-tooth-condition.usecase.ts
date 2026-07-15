import { inject, Injectable } from '@angular/core';

import { FdiTooth } from '../domain/odontogram';
import { OdontogramRepository } from '../domain/odontogram.repository';

@Injectable({ providedIn: 'root' })
export class UpdateToothConditionUseCase {
  private readonly repository = inject(OdontogramRepository);

  execute(patientId: string, tooth: FdiTooth) {
    return this.repository.updateTooth(patientId, tooth);
  }
}
