import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  TreatmentPlan,
  CreatePlanRequest,
  AddPhaseRequest,
  AddProcedureRequest,
  LinkDiagnosisRequest,
  Diagnosis,
  DiagnosisRequest,
  CatalogItem,
  Procedure,
} from '../domain/treatment-plan';
import { TreatmentPlanRepository } from '../domain/treatment-plan.repository';

interface CatalogServiceResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  price: number;
}

interface PaginatedCatalogServicesResponse {
  data: CatalogServiceResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class TreatmentPlanApiRepository implements TreatmentPlanRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  // ---- Plan CRUD -----------------------------------------------------------

  create(data: CreatePlanRequest): Observable<TreatmentPlan> {
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  findById(id: string): Observable<TreatmentPlan> {
    void id;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  findByPatientId(patientId: string): Observable<TreatmentPlan[]> {
    void patientId;
    return of([]);
  }

  update(id: string, data: Partial<TreatmentPlan>): Observable<TreatmentPlan> {
    void id;
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  delete(id: string): Observable<void> {
    void id;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  // ---- Phases --------------------------------------------------------------

  addPhase(planId: string, data: AddPhaseRequest): Observable<TreatmentPlan> {
    void planId;
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  // ---- Procedures ----------------------------------------------------------

  addProcedure(
    planId: string,
    phaseId: string,
    data: AddProcedureRequest,
  ): Observable<TreatmentPlan> {
    void planId;
    void phaseId;
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  updateProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
    data: Partial<Procedure>,
  ): Observable<TreatmentPlan> {
    void planId;
    void phaseId;
    void procedureId;
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  removeProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
  ): Observable<TreatmentPlan> {
    void planId;
    void phaseId;
    void procedureId;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  // ---- Diagnostics ---------------------------------------------------------

  linkDiagnosis(
    planId: string,
    data: LinkDiagnosisRequest,
  ): Observable<TreatmentPlan> {
    void planId;
    void data;
    return throwError(() => new Error('Treatment plan endpoint is not available in the backend yet.'));
  }

  getDiagnoses(patientId: string): Observable<Diagnosis[]> {
    void patientId;
    return of([]);
  }

  addDiagnosis(data: DiagnosisRequest): Observable<Diagnosis> {
    void data;
    return throwError(() => new Error('Diagnosis endpoint is not available in the backend yet.'));
  }

  // ---- Catalogue -----------------------------------------------------------

  getCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<PaginatedCatalogServicesResponse>(`${this.apiUrl}/catalog/services`, {
        params: { page: 1, limit: 100 },
      })
      .pipe(
        map((response) =>
          response.data.map((service) => ({
            id: service.id,
            code: service.id,
            name: service.name,
            defaultCost: service.price,
            category: 'other' as const,
          })),
        ),
      );
  }
}
