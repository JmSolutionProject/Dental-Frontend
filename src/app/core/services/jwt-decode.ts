export interface JwtPayload {
  sub: string;
  role: string;
  roles: string[];
  name: string;
  clinicId: string;
}

/**
 * Decodes a base64url-encoded JWT payload without verifying the signature.
 * Returns null if the token is invalid or the payload is malformed.
 */
export function jwtDecode(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = base64UrlDecode(parts[1]);
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(payload);

    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter((role: unknown): role is string => typeof role === 'string')
      : [];
    const normalizedRoles = roles.map(normalizeRole);
    const role =
      typeof parsed.role === 'string'
        ? normalizeRole(parsed.role)
        : normalizedRoles[0];

    if ((typeof parsed.sub !== 'string' && typeof parsed.sub !== 'number') || !role) {
      return null;
    }

    return {
      sub: String(parsed.sub),
      role,
      roles: normalizedRoles,
      name: parsed.name ?? parsed.nombreCompleto ?? '',
      clinicId: parsed.clinicId ?? '',
    };
  } catch {
    return null;
  }
}

function normalizeRole(role: string): string {
  const map: Record<string, string> = {
    MEDICO: 'dentist',
    medico: 'dentist',
    SECRETARIA: 'receptionist',
    secretaria: 'receptionist',
  };

  return map[role] ?? role;
}

function base64UrlDecode(input: string): string | null {
  try {
    // Replace URL-safe characters and pad
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const pad = base64.length % 4;
    if (pad === 2) {
      base64 += '==';
    } else if (pad === 3) {
      base64 += '=';
    } else if (pad !== 0) {
      return null;
    }

    // Use atob for decoding (available in browser and Node 16+)
    const decoded = atob(base64);
    return decoded;
  } catch {
    return null;
  }
}
