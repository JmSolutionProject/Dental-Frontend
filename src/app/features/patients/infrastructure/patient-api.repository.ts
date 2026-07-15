import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_URL } from '../../../core/config/api.config';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../domain/patient';
import { FindAllParams, PaginatedResponse, PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class PatientApiRepository implements PatientRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindAllParams) {
    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit != null) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.sortDir) {
      httpParams = httpParams.set('sortDir', params.sortDir);
    }

    return this.http.get<PaginatedResponse<Patient>>(`${this.apiUrl}/patients`, {
      params: httpParams,
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
