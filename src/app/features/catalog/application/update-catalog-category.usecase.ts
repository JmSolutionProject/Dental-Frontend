import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CatalogCategory } from '../domain/catalog';
import { CatalogRepository } from '../domain/catalog.repository';

@Injectable({ providedIn: 'root' })
export class UpdateCatalogCategoryUseCase {
  private readonly repository = inject(CatalogRepository);

  execute(id: string, name: string): Observable<CatalogCategory> {
    return this.repository.updateCategory(id, name);
  }
}
