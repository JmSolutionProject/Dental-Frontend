import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import { CreatePatientRequest, Patient, PatientStatus, UpdatePatientRequest } from '../domain/patient';
import { FindAllParams, PaginatedResponse, PatientRepository } from '../domain/patient.repository';

interface BackendPatient extends Omit<Partial<Patient>, 'id'> {
  id?: string | number;
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  numeroDocumento?: string;
  dni?: string;
  telefonoWhatsapp?: string;
  telefono?: string;
  correoElectronico?: string;
  direccion?: string;
  direccionDomicilio?: string;
  estado?: string;
  alergiasCriticas?: string;
  observaciones?: string;
}

interface BackendPaginatedPatientsResponse {
  data: BackendPatient[];
  total: number;
  page: number;
  limit: number;
}

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

    return this.http
      .get<BackendPaginatedPatientsResponse>(`${this.apiUrl}/patients`, {
        params: httpParams,
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data.map((patient) => this.fromBackendPatient(patient)),
        })),
      );
  }

  findById(id: string) {
    return this.http
      .get<BackendPatient>(`${this.apiUrl}/patients/${id}`)
      .pipe(map((response) => this.fromBackendPatient(response)));
  }

  create(patient: CreatePatientRequest) {
    return this.http
      .post<BackendPatient | { count: number }>(
        `${this.apiUrl}/patients`,
        this.toBackendPatientDto(patient),
      )
      .pipe(
        map((response) => ('id' in response ? this.fromBackendPatient(response) : null)),
      );
  }

  update(id: string, data: UpdatePatientRequest) {
    return this.http
      .put<BackendPatient>(`${this.apiUrl}/patients/${id}`, this.toBackendPatientDto(data))
      .pipe(map((response) => this.fromBackendPatient(response)));
  }

  softDelete(id: string) {
    return this.http.delete<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  private toBackendPatientDto(data: CreatePatientRequest | UpdatePatientRequest) {
    const allergies = 'medicalHistory' in data
      ? data.medicalHistory?.allergies?.join(', ')
      : undefined;

    const documentNumber = this.pickString(data.documentNumber);
    const address = 'address' in data ? this.pickString(data.address) : undefined;
    const email = 'email' in data ? this.pickString(data.email) : undefined;

    return {
      nombres: this.pickString(data.firstName),
      apellidos: this.pickString(data.lastName),
      fechaNacimiento: this.pickString(data.birthDate),
      telefonoWhatsapp: this.pickString(data.phone),
      alergiasCriticas: allergies,
      numeroDocumento: documentNumber,
    };
  }

  private fromBackendPatient(data: BackendPatient): Patient {
    const documentNumber =
      this.pickString(data.documentNumber) ??
      this.pickString(data.numeroDocumento) ??
      this.pickString(data.dni) ??
      '';

    const status = this.normalizeStatus(data.status ?? data.estado);

    return {
      id: String(data.id ?? ''),
      firstName: this.pickString(data.firstName) ?? this.pickString(data.nombres) ?? '',
      lastName: this.pickString(data.lastName) ?? this.pickString(data.apellidos) ?? '',
      documentNumber,
      phone:
        this.pickString(data.phone) ??
        this.pickString(data.telefonoWhatsapp) ??
        this.pickString(data.telefono) ??
        '',
      email: this.pickString(data.email) ?? this.pickString(data.correoElectronico) ?? undefined,
      address:
        this.pickString(data.address) ??
        this.pickString(data.direccionDomicilio) ??
        this.pickString(data.direccion) ??
        undefined,
      birthDate: this.pickString(data.birthDate) ?? this.pickString(data.fechaNacimiento) ?? undefined,
      status,
      medicalHistory: data.medicalHistory ?? {
        allergies: this.parseCsv(data.alergiasCriticas),
        conditions: [],
        medications: [],
      },
      notes: this.pickString(data.notes) ?? this.pickString(data.observaciones) ?? '',
    };
  }

  private normalizeStatus(status: unknown): PatientStatus {
    const value = this.pickString(status)?.toLowerCase() ?? 'active';
    if (value === 'deleted' || value === 'eliminado') return 'deleted';
    if (value === 'inactive' || value === 'inactivo') return 'inactive';
    return 'active';
  }

  private parseCsv(value: unknown): string[] {
    const text = this.pickString(value);
    if (!text) return [];
    return text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private pickString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

}
