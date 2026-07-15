import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class TreatmentPlanApiRepository implements TreatmentPlanRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private base = () => `${this.apiUrl}/treatment-plans`;

  // ---- Plan CRUD -----------------------------------------------------------

  create(data: CreatePlanRequest): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(this.base(), data);
  }

  findById(id: string): Observable<TreatmentPlan> {
    return this.http.get<TreatmentPlan>(`${this.base()}/${id}`);
  }

  findByPatientId(patientId: string): Observable<TreatmentPlan[]> {
    return this.http.get<TreatmentPlan[]>(this.base(), {
      params: { patientId },
    });
  }

  update(id: string, data: Partial<TreatmentPlan>): Observable<TreatmentPlan> {
    return this.http.put<TreatmentPlan>(`${this.base()}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base()}/${id}`);
  }

  // ---- Phases --------------------------------------------------------------

  addPhase(planId: string, data: AddPhaseRequest): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(`${this.base()}/${planId}/phases`, data);
  }

  // ---- Procedures ----------------------------------------------------------

  addProcedure(
    planId: string,
    phaseId: string,
    data: AddProcedureRequest,
  ): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(
      `${this.base()}/${planId}/phases/${phaseId}/procedures`,
      data,
    );
  }

  updateProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
    data: Partial<Procedure>,
  ): Observable<TreatmentPlan> {
    return this.http.put<TreatmentPlan>(
      `${this.base()}/${planId}/phases/${phaseId}/procedures/${procedureId}`,
      data,
    );
  }

  removeProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
  ): Observable<TreatmentPlan> {
    return this.http.delete<TreatmentPlan>(
      `${this.base()}/${planId}/phases/${phaseId}/procedures/${procedureId}`,
    );
  }

  // ---- Diagnostics ---------------------------------------------------------

  linkDiagnosis(
    planId: string,
    data: LinkDiagnosisRequest,
  ): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(
      `${this.base()}/${planId}/diagnostics`,
      data,
    );
  }

  getDiagnoses(patientId: string): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.apiUrl}/diagnoses`, {
      params: { patientId },
    });
  }

  addDiagnosis(data: DiagnosisRequest): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(`${this.apiUrl}/diagnoses`, data);
  }

  // ---- Catalogue -----------------------------------------------------------

  getCatalog(): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(`${this.apiUrl}/procedure-catalog`);
  }
}
