import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { FdiTooth, Odontogram } from '../domain/odontogram';
import { OdontogramRepository } from '../domain/odontogram.repository';

@Injectable({ providedIn: 'root' })
export class OdontogramApiRepository implements OdontogramRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findByPatientId(patientId: string) {
    return this.http
      .get<FdiTooth[]>(`${this.apiUrl}/odontogram/details`, {
        params: { patientId },
      })
      .pipe(map((details) => this.detailsToOdontogram(patientId, details)));
  }

  updateTooth(patientId: string, tooth: FdiTooth) {
    const detailId = tooth.surface
      ? tooth.surfaceDetailIds?.[tooth.surface]
      : tooth.detailId ?? tooth.id;
    const payload = {
      patientId,
      fdiNumber: tooth.fdiNumber,
      condition: tooth.condition,
      ...(tooth.surface ? { surface: tooth.surface } : {}),
      notes: tooth.notes ?? '',
    };

    const request = detailId
      ? this.http.put<FdiTooth>(`${this.apiUrl}/odontogram/details/${detailId}`, payload)
      : this.http.post<FdiTooth>(`${this.apiUrl}/odontogram/details`, payload);

    return request.pipe(map((updatedTooth) => this.detailsToOdontogram(patientId, [updatedTooth])));
  }

  private detailsToOdontogram(patientId: string, details: FdiTooth[]): Odontogram {
    const teethByFdi = new Map<number, FdiTooth>();

    for (const detail of details) {
      const current = teethByFdi.get(detail.fdiNumber) ?? {
        fdiNumber: detail.fdiNumber,
        condition: 'healthy' as const,
        notes: '',
        surfaceConditions: {},
        surfaceDetailIds: {},
      };

      if (detail.surface) {
        current.surfaceConditions = {
          ...current.surfaceConditions,
          [detail.surface]: detail.condition,
        };
        current.surfaceDetailIds = {
          ...current.surfaceDetailIds,
          [detail.surface]: detail.detailId ?? detail.id,
        };
        current.condition = detail.condition;
      } else {
        current.id = detail.id;
        current.detailId = detail.detailId;
        current.condition = detail.condition;
        current.notes = detail.notes;
      }

      teethByFdi.set(detail.fdiNumber, current);
    }

    return {
      patientId,
      quadrant: 'adult',
      teeth: Array.from(teethByFdi.values()),
    };
  }
}
