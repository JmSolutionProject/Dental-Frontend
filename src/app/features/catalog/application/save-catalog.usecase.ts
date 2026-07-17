import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogRepository } from '../domain/catalog.repository';
import { CatalogService, SaveCatalogServiceRequest } from '../domain/catalog';

@Injectable({ providedIn: 'root' })
export class SaveCatalogUseCase {
  private readonly repository = inject(CatalogRepository);

  execute(request: SaveCatalogServiceRequest, id?: string): Observable<CatalogService> {
    if (id) {
      return this.repository.update(id, request);
    }
    return this.repository.save(request);
  }
}
