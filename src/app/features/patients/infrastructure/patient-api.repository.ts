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

  createFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<File>(`${this.apiUrl}/files/upload`, formData);
  }

  private toBackendPatientDto(data: CreatePatientRequest | UpdatePatientRequest) {
    let alergiasCriticas: string | undefined = undefined;
    if ('medicalHistory' in data && data.medicalHistory) {
      const mh = data.medicalHistory;
      const cleanAllergies = (mh.allergies || []).filter((a) => a && a !== 'Ninguna' && a !== 'Ninguno' && typeof a === 'string' && !a.startsWith('{'));
      const cleanConditions = (mh.conditions || []).filter((c) => c && c !== 'Ninguna' && c !== 'Ninguno' && typeof c === 'string');
      const cleanSpecialConditions = (mh.specialConditions || []).filter((s) => s && s !== 'Ninguna' && s !== 'Ninguno' && typeof s === 'string');
      const cleanDentalHistory = (mh.dentalHistory || []).filter((d) => d && d !== 'Ninguno' && typeof d === 'string');
      const cleanMedications = (mh.medications || []).filter((m) => m && m !== 'Ninguna' && m !== 'Ninguno' && typeof m === 'string');

      alergiasCriticas = JSON.stringify({
        allergies: cleanAllergies,
        conditions: cleanConditions,
        specialConditions: cleanSpecialConditions,
        dentalHistory: cleanDentalHistory,
        medications: cleanMedications,
      });
    }

    const documentNumber = this.pickString(data.documentNumber);
    const address = 'address' in data ? this.pickString(data.address) : undefined;
    const email = 'email' in data ? this.pickString(data.email) : undefined;

    let estado: boolean | undefined = undefined;
    if ('status' in data && data.status) {
      estado = data.status === 'active';
    } else if ('estado' in data) {
      estado = (data as any).estado;
    }

    return {
      nombres: this.pickString(data.firstName),
      apellidos: this.pickString(data.lastName),
      fechaNacimiento: this.pickString(data.birthDate),
      telefonoWhatsapp: this.pickString(data.phone),
      alergiasCriticas,
      numeroDocumento: documentNumber,
      observaciones: this.pickString(data.observaciones),
      estado,
    };
  }

  private flattenList(items: unknown[] | undefined | null): string[] {
    if (!items || !Array.isArray(items)) return [];
    const result: string[] = [];
    for (const item of items) {
      if (typeof item === 'string' && item.trim()) {
        if (item.startsWith('{')) continue;
        const parts = item.split(',').map((s) => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (!result.includes(p)) {
            result.push(p);
          }
        }
      }
    }
    return result;
  }

  private fromBackendPatient(data: BackendPatient): Patient {
    const documentNumber =
      this.pickString(data.documentNumber) ??
      this.pickString(data.numeroDocumento) ??
      this.pickString(data.dni) ??
      '';

    const status = this.normalizeStatus(data.status ?? data.estado);

    let medicalHistory = {
      allergies: [] as string[],
      conditions: [] as string[],
      specialConditions: [] as string[],
      dentalHistory: [] as string[],
      medications: [] as string[],
    };

    const rawAlergias = this.pickString(data.alergiasCriticas);
    if (rawAlergias) {
      if (rawAlergias.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawAlergias);
          medicalHistory = {
            allergies: this.flattenList(parsed.allergies),
            conditions: this.flattenList(parsed.conditions),
            specialConditions: this.flattenList(parsed.specialConditions),
            dentalHistory: this.flattenList(parsed.dentalHistory),
            medications: this.flattenList(parsed.medications),
          };
        } catch {
          medicalHistory.allergies = this.parseCsv(rawAlergias);
        }
      } else {
        medicalHistory.allergies = this.parseCsv(rawAlergias);
      }
    } else if (data.medicalHistory && typeof data.medicalHistory === 'object') {
      const mh = data.medicalHistory as {
        allergies?: unknown[];
        conditions?: unknown[];
        specialConditions?: unknown[];
        dentalHistory?: unknown[];
        medications?: unknown[];
      };

      const allergiesRaw = mh.allergies ?? [];
      let allergies = this.flattenList(allergiesRaw);
      let conditions = this.flattenList(mh.conditions ?? []);
      let specialConditions = this.flattenList(mh.specialConditions ?? []);
      let dentalHistory = this.flattenList(mh.dentalHistory ?? []);
      let medications = this.flattenList(mh.medications ?? []);

      const firstAllergy = allergiesRaw[0];
      if (typeof firstAllergy === 'string' && firstAllergy.startsWith('{')) {
        try {
          const parsed = JSON.parse(firstAllergy);
          allergies = this.flattenList(parsed.allergies);
          conditions = this.flattenList(parsed.conditions);
          specialConditions = this.flattenList(parsed.specialConditions);
          dentalHistory = this.flattenList(parsed.dentalHistory);
          medications = this.flattenList(parsed.medications);
        } catch {
          // Keep the flattened values
        }
      }

      medicalHistory = {
        allergies,
        conditions,
        specialConditions,
        dentalHistory,
        medications,
      };
    }

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
      medicalHistory,
      notes: this.pickString(data.notes) ?? this.pickString(data.observaciones) ?? '',
      observaciones: this.pickString(data.observaciones) ?? this.pickString(data.notes) ?? '',
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
