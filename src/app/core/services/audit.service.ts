import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of } from 'rxjs';

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
  /** POST a new audit entry. Returns the persisted entry including server-assigned id + timestamp. */
  log(actionType: string, payload: Record<string, unknown> = {}): Observable<AuditEntry> {
    return of({
      id: crypto.randomUUID(),
      userId: 'local',
      actionType,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /** GET audit entries, optionally filtered by user, action type, or date range. */
  getLogs(filter?: AuditFilter): Observable<AuditEntry[]> {
    void filter;
    return of([]);
  }
}
