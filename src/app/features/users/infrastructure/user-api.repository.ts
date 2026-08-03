import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api.config';
import { ChangeUserPasswordRequest, SaveUserRequest, UpdateUserRequest, User } from '../domain/user';

@Injectable({ providedIn: 'root' })
export class UserRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  save(request: SaveUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, request);
  }

  update(id: number, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, request);
  }

  changePassword(id: number, request: ChangeUserPasswordRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}/password`, request);
  }

  disable(id: number): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/users/${id}`);
  }
}
