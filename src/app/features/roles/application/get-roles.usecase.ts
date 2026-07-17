import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleRepository } from '../domain/role.repository';
import { Role } from '../domain/role';

@Injectable({ providedIn: 'root' })
export class GetRolesUseCase {
  private readonly repository = inject(RoleRepository);

  execute(): Observable<Role[]> {
    return this.repository.getAll();
  }
}
