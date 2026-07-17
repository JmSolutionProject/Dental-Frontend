import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogRepository } from '../domain/catalog.repository';

@Injectable({ providedIn: 'root' })
export class DeleteCatalogUseCase {
  private readonly repository = inject(CatalogRepository);

  execute(id: string): Observable<boolean> {
    return this.repository.delete(id);
  }
}
