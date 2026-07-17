import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from '../../../core/config/api.config';
import { CatalogRepository } from '../domain/catalog.repository';
import { CatalogService, SaveCatalogServiceRequest } from '../domain/catalog';

interface BackendService {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  price: number;
  status: string;
}

interface BackendPaginatedResponse {
  data: BackendService[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiRepository implements CatalogRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getAll(): Observable<CatalogService[]> {
    return this.http
      .get<BackendPaginatedResponse>(`${this.apiUrl}/catalog/services?limit=100`)
      .pipe(map((res) => res.data.map((s) => this.toDomain(s))));
  }

  save(request: SaveCatalogServiceRequest): Observable<CatalogService> {
    return this.http
      .post<BackendService>(`${this.apiUrl}/catalog/services`, {
        nombreServicio: request.name,
        categoriaId: Number(request.categoryId),
        precio: request.price,
        descripcion: request.description ?? '',
      })
      .pipe(map((s) => this.toDomain(s)));
  }

  update(id: string, request: SaveCatalogServiceRequest): Observable<CatalogService> {
    return this.http
      .put<BackendService>(`${this.apiUrl}/catalog/services/${id}`, {
        nombreServicio: request.name,
        categoriaId: Number(request.categoryId),
        precio: request.price,
        descripcion: request.description ?? '',
      })
      .pipe(map((s) => this.toDomain(s)));
  }

  delete(id: string): Observable<boolean> {
    return this.http
      .delete<BackendService>(`${this.apiUrl}/catalog/services/${id}`)
      .pipe(map(() => true));
  }

  private toDomain(s: BackendService): CatalogService {
    return {
      id: s.id,
      name: s.name,
      categoryName: s.categoryName,
      categoryId: s.categoryId,
      price: s.price,
      description: s.status === 'active' ? '' : '',
      status: s.status === 'active' ? 'active' : 'inactive',
    };
  }
}
