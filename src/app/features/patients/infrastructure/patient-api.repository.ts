import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../domain/patient';
import { FindAllParams, PaginatedResponse, PatientRepository } from '../domain/patient.repository';

@Injectable({ providedIn: 'root' })
export class PatientApiRepository implements PatientRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(params?: FindAllParams) {
    let httpParams = new HttpParams()
      .set('page', String(params?.page ?? 1))
      .set('limit', String(params?.limit ?? 10));

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
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
    return this.http
      .post<Patient | { count: number }>(
        `${this.apiUrl}/patients`,
        this.toBackendPatientDto(patient),
      )
      .pipe(map((response) => ('id' in response ? response : null)));
  }

  update(id: string, data: UpdatePatientRequest) {
    return this.http.put<Patient>(
      `${this.apiUrl}/patients/${id}`,
      this.toBackendPatientDto(data),
    );
  }

  softDelete(id: string) {
    return this.http.delete<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  private toBackendPatientDto(data: CreatePatientRequest | UpdatePatientRequest) {
    const allergies = 'medicalHistory' in data
      ? data.medicalHistory?.allergies?.join(', ')
      : undefined;

    return {
      nombres: data.firstName,
      apellidos: data.lastName,
      fechaNacimiento: data.birthDate,
      telefonoWhatsapp: data.phone,
      alergiasCriticas: allergies,
    };
  }

}
