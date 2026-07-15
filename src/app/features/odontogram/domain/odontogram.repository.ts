import { Observable } from 'rxjs';

import { FdiTooth, Odontogram } from './odontogram';

export abstract class OdontogramRepository {
  abstract findByPatientId(patientId: string): Observable<Odontogram>;
  abstract updateTooth(
    patientId: string,
    tooth: FdiTooth,
  ): Observable<Odontogram>;
}
