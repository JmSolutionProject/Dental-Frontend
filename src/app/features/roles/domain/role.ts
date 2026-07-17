export interface Role {
  id: string;
  nombreRol: string;
  estado: 'active' | 'inactive';
}

export interface SaveRoleRequest {
  nombreRol: string;
  estado?: 'active' | 'inactive';
}
