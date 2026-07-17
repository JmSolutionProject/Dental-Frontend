import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogRepository } from '../domain/catalog.repository';
import { CatalogService } from '../domain/catalog';

@Injectable({ providedIn: 'root' })
export class GetCatalogUseCase {
  private readonly repository = inject(CatalogRepository);

  execute(): Observable<CatalogService[]> {
    return this.repository.getAll();
  }
}
