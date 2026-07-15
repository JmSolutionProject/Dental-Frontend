import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { of } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../domain/patient';
import { FindAllParams, PaginatedResponse, PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class PatientApiRepository implements PatientRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindAllParams) {
    return of<PaginatedResponse<Patient>>({
      data: [],
      total: 0,
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    });
  }

  findById(id: string) {
    return this.http.get<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  create(patient: CreatePatientRequest) {
    return this.http.post<Patient>(`${this.apiUrl}/patients`, patient);
  }

  update(id: string, data: UpdatePatientRequest) {
    return this.http.put<Patient>(`${this.apiUrl}/patients/${id}`, data);
  }

  softDelete(id: string) {
    return this.http.patch<void>(`${this.apiUrl}/patients/${id}`, {
      status: 'deleted',
    });
  }
}
