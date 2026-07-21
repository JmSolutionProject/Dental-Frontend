import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { API_URL } from '../config/api.config';
import { jwtDecode, JwtPayload } from './jwt-decode';

const TOKEN_KEY = 'dental_clinic_token';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly tokenState = signal<string | null>(this.readToken());

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken && storedToken !== this.tokenState()) {
        this.tokenState.set(storedToken);
      }
    }
  }

  readonly token = this.tokenState.asReadonly();
  readonly user = computed<JwtPayload | null>(() => {
    const t = this.tokenState();
    return t ? jwtDecode(t) : null;
  });
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role?.toLowerCase() ?? null);
  readonly roles = computed(() => this.user()?.roles?.map(r => r.toLowerCase()) ?? []);
  readonly clinicId = computed(() => this.user()?.clinicId ?? null);

  login(email: string, password: string): Observable<void> {
    const url = `${this.apiUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((response) => this.setToken(response.accessToken)),
      map(() => undefined),
    );
  }

  logout() {
    this.setToken(null);
  }

  private setToken(token: string | null) {
    this.tokenState.set(token);

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
  }

  private readToken() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
