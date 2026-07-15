import { Observable } from 'rxjs';

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
} from './treatment-plan';

export abstract class TreatmentPlanRepository {
  abstract create(data: CreatePlanRequest): Observable<TreatmentPlan>;
  abstract findById(id: string): Observable<TreatmentPlan>;
  abstract findByPatientId(patientId: string): Observable<TreatmentPlan[]>;
  abstract update(id: string, data: Partial<TreatmentPlan>): Observable<TreatmentPlan>;
  abstract delete(id: string): Observable<void>;

  abstract addPhase(planId: string, data: AddPhaseRequest): Observable<TreatmentPlan>;
  abstract addProcedure(
    planId: string,
    phaseId: string,
    data: AddProcedureRequest,
  ): Observable<TreatmentPlan>;
  abstract updateProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
    data: Partial<Procedure>,
  ): Observable<TreatmentPlan>;
  abstract removeProcedure(
    planId: string,
    phaseId: string,
    procedureId: string,
  ): Observable<TreatmentPlan>;

  abstract linkDiagnosis(
    planId: string,
    data: LinkDiagnosisRequest,
  ): Observable<TreatmentPlan>;

  abstract getDiagnoses(patientId: string): Observable<Diagnosis[]>;
  abstract addDiagnosis(data: DiagnosisRequest): Observable<Diagnosis>;

  abstract getCatalog(): Observable<CatalogItem[]>;
}
