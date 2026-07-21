import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CatalogCategory } from '../domain/catalog';
import { CatalogRepository } from '../domain/catalog.repository';

@Injectable({ providedIn: 'root' })
export class CreateCatalogCategoryUseCase {
  private readonly repository = inject(CatalogRepository);

  execute(name: string): Observable<CatalogCategory> {
    return this.repository.createCategory(name);
  }
}
