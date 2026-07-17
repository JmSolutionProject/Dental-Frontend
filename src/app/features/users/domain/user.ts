export interface UserRole {
  id: number;
  nombreRol: string;
}

export interface User {
  id: number;
  nombreCompleto: string;
  email: string;
  estado: boolean;
  roles: UserRole[];
  fechaRegistro: string;
}

export interface SaveUserRequest {
  nombreCompleto: string;
  email: string;
  password?: string;
  roleIds: number[];
}
