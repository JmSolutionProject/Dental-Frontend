import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, switchMap, throwError } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { FdiTooth, Odontogram, ToothCondition, ToothSurface } from '../domain/odontogram';
import { OdontogramRepository } from '../domain/odontogram.repository';

interface OdontogramDetailResponse {
  id?: string | number;
  detailId?: string | number;
  fdiNumber: number;
  condition?: string;
  surface?: string;
  surfaceId?: string | number;
  surfaceName?: string;
  stateName?: string;
  diagnosis?: string;
  notes?: string;
  history?: Array<{
    id?: string | number;
    date?: string;
    condition: string;
    surface?: string | null;
    notes?: string | null;
  }>;
}

interface DetailsByPatientResponse {
  patientId: string;
  dentition?: 'adult' | 'child';
  details: OdontogramDetailResponse[];
}

interface DentalSurfaceResponse {
  id: string | number;
  nombreSuperficie: string;
  abreviatura?: string;
}

@Injectable({ providedIn: 'root' })
export class OdontogramApiRepository implements OdontogramRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findByPatientId(patientId: string) {
    return this.http
      .get<DetailsByPatientResponse>(
        `${this.apiUrl}/odontogram/details/by-patient/${patientId}`,
      )
      .pipe(
        catchError(() =>
          of({ patientId, dentition: 'adult' as const, details: [] }),
        ),
        switchMap((response) =>
          this.http
            .get<DentalSurfaceResponse[]>(`${this.apiUrl}/odontogram/surfaces`)
            .pipe(
              catchError(() => of([] as DentalSurfaceResponse[])),
              map((surfaces) =>
                this.detailsToOdontogram(
                  patientId,
                  response.details ?? [],
                  response.dentition,
                  surfaces,
                ),
              ),
            ),
        ),
      );
  }

  updateTooth(patientId: string, tooth: FdiTooth) {
    const patientIdNumber = Number(patientId);

    if (!Number.isFinite(patientIdNumber)) {
      return throwError(() => new Error(`ID de paciente inválido para odontograma: ${patientId}`));
    }

    const conditionName = this.toApiCondition(tooth.condition);
    const notes = (tooth.notes ?? '').trim();
    const payload: Record<string, unknown> = {
      patientId: patientIdNumber,
      fdiNumber: tooth.fdiNumber,
      condition: conditionName,
    };

    if (tooth.surface) {
      payload['surface'] = this.toApiSurface(tooth.surface);
    }

    if (notes) {
      payload['observacion'] = notes;
    }
    if (tooth.history) {
      payload['history'] = tooth.history;
    }

    return this.http
      .post<OdontogramDetailResponse>(`${this.apiUrl}/odontogram/details`, payload)
      .pipe(map((detail) => this.detailsToOdontogram(patientId, [detail])));
  }

  private detailsToOdontogram(
    patientId: string,
    details: OdontogramDetailResponse[],
    dentition: 'adult' | 'child' = 'adult',
    surfaces: DentalSurfaceResponse[] = [],
  ): Odontogram {
    const teethByFdi = new Map<number, FdiTooth>();

    for (const detail of details) {
      const fdiNumber = Number(detail.fdiNumber);
      const surface = this.toToothSurface(detail.surfaceName ?? detail.surface, detail.surfaceId, surfaces);
      const condition = this.toToothCondition(detail.stateName ?? detail.condition ?? detail.diagnosis);
      const current = teethByFdi.get(fdiNumber) ?? {
        fdiNumber,
        condition: 'healthy' as const,
        notes: '',
        surfaceConditions: {},
        surfaceDetailIds: {},
      };

      if (surface) {
        current.surfaceConditions = {
          ...current.surfaceConditions,
          [surface]: condition,
        };
        current.surfaceDetailIds = {
          ...current.surfaceDetailIds,
          [surface]: detail.detailId ?? detail.id,
        };
        current.condition = condition;
        if (detail.notes) {
          current.notes = current.notes || detail.notes;
        }
      } else {
        current.id = detail.id;
        current.detailId = detail.detailId;
        current.condition = condition;
        current.stateName = detail.stateName;
        current.diagnosis = detail.diagnosis ?? null;
        current.notes = detail.notes ?? current.notes;
      }

      current.history = [
        ...(current.history ?? []),
        ...(detail.history ?? []).map((record) => ({
          id: String(record.id ?? `${fdiNumber}-${record.date}-${record.condition}`),
          date: record.date ?? '',
          condition: this.toToothCondition(record.condition),
          surface: this.toToothSurface(record.surface ?? undefined, undefined, surfaces) ?? undefined,
          notes: record.notes ?? undefined,
        })),
      ];

      teethByFdi.set(fdiNumber, current);
    }

    return {
      patientId,
      quadrant: dentition,
      teeth: Array.from(teethByFdi.values()),
    };
  }

  private toApiCondition(condition: ToothCondition): string {
    const labels: Record<ToothCondition, string> = {
      healthy: 'Sano',
      caries: 'Caries',
      restoration: 'Obturado',
      extraction: 'Extracción',
      crown: 'Corona',
      missing: 'Ausente',
      endodontics: 'Endodoncia',
      implant: 'Implante',
      sealant: 'Sellante',
      fracture: 'Fractura',
      healed: 'Curado',
    };
    return labels[condition];
  }

  private toToothCondition(value?: string): ToothCondition {
    const normalized = this.normalize(value);
    if (normalized.includes('caries')) return 'caries';
    if (normalized.includes('obturado') || normalized.includes('restauracion') || normalized.includes('curacion')) return 'restoration';
    if (normalized.includes('extraccion')) return 'extraction';
    if (normalized.includes('corona')) return 'crown';
    if (normalized.includes('ausente')) return 'missing';
    if (normalized.includes('endodoncia')) return 'endodontics';
    if (normalized.includes('implante')) return 'implant';
    if (normalized.includes('sellante')) return 'sealant';
    if (normalized.includes('fractura')) return 'fracture';
    if (normalized.includes('curado')) return 'healed';
    return 'healthy';
  }

  private toApiSurface(surface: ToothSurface): string {
    const labels: Record<ToothSurface, string> = {
      vestibular: 'Vestibular',
      lingualPalatal: 'Lingual / Palatina',
      mesial: 'Mesial',
      distal: 'Distal',
      occlusal: 'Oclusal',
    };
    return labels[surface];
  }

  private toToothSurface(
    value?: string,
    surfaceId?: string | number,
    surfaces: DentalSurfaceResponse[] = [],
  ): ToothSurface | null {
    const catalogSurface = surfaceId == null
      ? null
      : surfaces.find((surface) => String(surface.id) === String(surfaceId));

    if (catalogSurface) {
      return this.toToothSurface(catalogSurface.nombreSuperficie ?? catalogSurface.abreviatura);
    }

    const normalized = this.normalize(value);
    if (normalized.includes('vestibular')) return 'vestibular';
    if (normalized.includes('lingual') || normalized.includes('palatina') || normalized.includes('palatal')) return 'lingualPalatal';
    if (normalized.includes('mesial')) return 'mesial';
    if (normalized.includes('distal')) return 'distal';
    if (normalized.includes('oclusal') || normalized.includes('occlusal')) return 'occlusal';

    if (normalized === 'v') return 'vestibular';
    if (normalized === 'l' || normalized === 'p' || normalized === 'lp') return 'lingualPalatal';
    if (normalized === 'm') return 'mesial';
    if (normalized === 'd') return 'distal';
    if (normalized === 'o') return 'occlusal';

    return null;
  }

  private normalize(value?: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
