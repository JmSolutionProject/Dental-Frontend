import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';

// ---------------------------------------------------------------------------
// Audit trail — domain types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  userId: string;
  actionType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface AuditFilter {
  userId?: string;
  actionType?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Dispatches audit entries to the backend and provides a read-only,
 * filterable audit log view for clinical and financial actions.
 *
 * Every mutation that has clinical or financial significance SHOULD call
 * `log()` so that an immutable trail exists for compliance and debugging.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private base = () => `${this.apiUrl}/audit-logs`;

  /** POST a new audit entry. Returns the persisted entry including server-assigned id + timestamp. */
  log(actionType: string, payload: Record<string, unknown> = {}): Observable<AuditEntry> {
    return this.http.post<AuditEntry>(this.base(), { actionType, payload });
  }

  /** GET audit entries, optionally filtered by user, action type, or date range. */
  getLogs(filter?: AuditFilter): Observable<AuditEntry[]> {
    let params = new HttpParams();

    if (filter?.userId) {
      params = params.set('userId', filter.userId);
    }
    if (filter?.actionType) {
      params = params.set('actionType', filter.actionType);
    }
    if (filter?.from) {
      params = params.set('from', filter.from);
    }
    if (filter?.to) {
      params = params.set('to', filter.to);
    }

    return this.http.get<AuditEntry[]>(this.base(), { params });
  }
}
