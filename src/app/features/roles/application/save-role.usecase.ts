import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleRepository } from '../domain/role.repository';
import { Role, SaveRoleRequest } from '../domain/role';

@Injectable({ providedIn: 'root' })
export class SaveRoleUseCase {
  private readonly repository = inject(RoleRepository);

  execute(request: SaveRoleRequest, id?: string): Observable<Role> {
    if (id) {
      return this.repository.update(id, request);
    }
    return this.repository.save(request);
  }
}
