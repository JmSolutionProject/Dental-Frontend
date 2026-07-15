import { Observable } from 'rxjs';

import { CreatePatientRequest, Patient, UpdatePatientRequest } from './patient';

export interface FindAllParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export abstract class PatientRepository {
  abstract findAll(params?: FindAllParams): Observable<PaginatedResponse<Patient>>;
  abstract findById(id: string): Observable<Patient>;
  abstract create(patient: CreatePatientRequest): Observable<Patient | null>;
  abstract update(id: string, data: UpdatePatientRequest): Observable<Patient>;
  abstract softDelete(id: string): Observable<Patient>;
}
