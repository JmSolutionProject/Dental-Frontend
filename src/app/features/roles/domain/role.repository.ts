import { Observable } from 'rxjs';
import { Role, SaveRoleRequest } from './role';

export abstract class RoleRepository {
  abstract getAll(): Observable<Role[]>;
  abstract save(request: SaveRoleRequest): Observable<Role>;
  abstract update(id: string, request: SaveRoleRequest): Observable<Role>;
  abstract delete(id: string): Observable<boolean>;
}
