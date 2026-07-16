import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';

export interface ReniecDniData {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  apellidos?: string;
}

export interface ReniecDniResponse {
  success?: boolean;
  message?: string;
  data?: ReniecDniData;
}

/**
 * Service that queries the backend's secure RENIEC endpoint for DNI data.
 * Keeps the frontend agnostic of third-party API URLs and credentials.
 */
@Injectable({
  providedIn: 'root',
})
export class ReniecService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  lookupDni(dni: string): Observable<ReniecDniResponse> {
    return this.http.get<ReniecDniResponse>(
      `${this.apiUrl}/patients/reniec/${dni}`,
    );
  }
}
