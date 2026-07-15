import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_URL } from '../../../core/config/api.config';
import { FdiTooth, Odontogram } from '../domain/odontogram';
import { OdontogramRepository } from '../domain/odontogram.repository';

@Injectable({ providedIn: 'root' })
export class OdontogramApiRepository implements OdontogramRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findByPatientId(patientId: string) {
    return this.http.get<Odontogram>(
      `${this.apiUrl}/odontograms/${patientId}`,
    );
  }

  updateTooth(patientId: string, tooth: FdiTooth) {
    return this.http.put<Odontogram>(
      `${this.apiUrl}/odontograms/${patientId}`,
      tooth,
    );
  }
}
