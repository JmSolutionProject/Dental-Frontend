import { Observable } from 'rxjs';
import { CatalogService, SaveCatalogServiceRequest } from './catalog';

export abstract class CatalogRepository {
  abstract getAll(): Observable<CatalogService[]>;
  abstract save(request: SaveCatalogServiceRequest): Observable<CatalogService>;
  abstract update(id: string, request: SaveCatalogServiceRequest): Observable<CatalogService>;
  abstract delete(id: string): Observable<boolean>;
}
