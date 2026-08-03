import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/config/api.config';
import {
  AccountProfile,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '../domain/account';

@Injectable({ providedIn: 'root' })
export class AccountRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findById(id: number): Observable<AccountProfile> {
    return this.http.get<AccountProfile>(`${this.apiUrl}/users/${id}`);
  }

  updateProfile(id: number, request: UpdateProfileRequest): Observable<AccountProfile> {
    return this.http.put<AccountProfile>(`${this.apiUrl}/users/${id}`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/users/me/password`, request);
  }
}
