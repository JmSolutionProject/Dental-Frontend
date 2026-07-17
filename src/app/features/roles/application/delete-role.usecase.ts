import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleRepository } from '../domain/role.repository';

@Injectable({ providedIn: 'root' })
export class DeleteRoleUseCase {
  private readonly repository = inject(RoleRepository);

  execute(id: string): Observable<boolean> {
    return this.repository.delete(id);
  }
}
