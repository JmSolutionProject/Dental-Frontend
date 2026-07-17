import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from '../../../core/config/api.config';
import { RoleRepository } from '../domain/role.repository';
import { Role, SaveRoleRequest } from '../domain/role';

interface BackendRole {
  id: number;
  nombreRol: string;
  estado: boolean;
}

interface BackendPaginatedResponse {
  data: BackendRole[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class RoleApiRepository implements RoleRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getAll(): Observable<Role[]> {
    return this.http
      .get<BackendPaginatedResponse>(`${this.apiUrl}/roles?limit=50`)
      .pipe(map((res) => res.data.map((r) => this.toDomain(r))));
  }

  save(request: SaveRoleRequest): Observable<Role> {
    return this.http
      .post<BackendRole>(`${this.apiUrl}/roles`, { nombreRol: request.nombreRol })
      .pipe(map((r) => this.toDomain(r)));
  }

  update(id: string, request: SaveRoleRequest): Observable<Role> {
    return this.http
      .put<BackendRole>(`${this.apiUrl}/roles/${id}`, {
        nombreRol: request.nombreRol,
        estado: request.estado,
      })
      .pipe(map((r) => this.toDomain(r)));
  }

  delete(id: string): Observable<boolean> {
    return this.http
      .delete<BackendRole>(`${this.apiUrl}/roles/${id}`)
      .pipe(map(() => true));
  }

  private toDomain(r: BackendRole): Role {
    return {
      id: String(r.id),
      nombreRol: r.nombreRol,
      estado: r.estado ? 'active' : 'inactive',
    };
  }
}
