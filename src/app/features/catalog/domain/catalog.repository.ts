import { Observable } from 'rxjs';
import { CatalogCategory, CatalogService, SaveCatalogServiceRequest } from './catalog';

export abstract class CatalogRepository {
  abstract getAll(): Observable<CatalogService[]>;
  abstract save(request: SaveCatalogServiceRequest): Observable<CatalogService>;
  abstract update(id: string, request: SaveCatalogServiceRequest): Observable<CatalogService>;
  abstract delete(id: string): Observable<boolean>;
  abstract getCategories(): Observable<CatalogCategory[]>;
  abstract createCategory(name: string): Observable<CatalogCategory>;
  abstract updateCategory(id: string, name: string): Observable<CatalogCategory>;
  abstract deleteCategory(id: string): Observable<boolean>;
}
