export interface AccountRole {
  id?: number;
  nombreRol: string;
}

export interface AccountProfile {
  id: number;
  nombreCompleto: string;
  email: string;
  roles: AccountRole[];
}

export interface UpdateProfileRequest {
  nombreCompleto: string;
  email: string;
  roleIds: number[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
