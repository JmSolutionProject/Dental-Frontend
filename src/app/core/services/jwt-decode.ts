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
    const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
    const parts = normalizedToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = base64UrlDecode(parts[1]);
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(payload);

    const rawRoles = readRoles(parsed);
    const rawRole = readFirstString(parsed, ['role', 'rol', 'roleName', 'nombreRol']);
    const role = rawRole ? normalizeRole(rawRole) : normalizeRole(rawRoles[0] ?? '');
    const normalizedRoles = Array.from(
      new Set([role, ...rawRoles.map(normalizeRole)].filter(Boolean)),
    );

    const sub = readFirstString(parsed, ['sub', 'id', 'userId', 'usuarioId', 'usuario_id']);

    if (!sub || !role) {
      return null;
    }

    return {
      sub,
      role,
      roles: normalizedRoles,
      name: readFirstString(parsed, ['name', 'nombreCompleto', 'nombre', 'email']) ?? '',
      clinicId: readFirstString(parsed, ['clinicId', 'clinicaId', 'clinic_id', 'tenantId']) ?? '',
    };
  } catch {
    return null;
  }
}

function readRoles(payload: Record<string, unknown>): string[] {
  const value = readFirstValue(payload, ['roles', 'authorities']);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return readFirstString(item as Record<string, unknown>, ['role', 'rol', 'name', 'authority']);
        }
        return null;
      })
      .filter((role): role is string => Boolean(role));
  }

  if (typeof value === 'string') {
    return value.split(',').map((role) => role.trim()).filter(Boolean);
  }

  return [];
}

function readFirstString(payload: Record<string, unknown>, keys: string[]): string | null {
  const value = readFirstValue(payload, keys);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);

  return null;
}

function readFirstValue(payload: Record<string, unknown>, keys: string[]): unknown {
  const entries = Object.entries(payload);
  for (const key of keys) {
    const match = entries.find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase());
    if (match) return match[1];
  }

  return null;
}

function normalizeRole(role: string): string {
  if (!role) return '';
  const normalized = role.toUpperCase();
  const map: Record<string, string> = {
    MEDICO: 'dentist',
    SECRETARIA: 'receptionist',
    ADMIN: 'ADMIN',
  };

  return map[normalized] ?? normalized;
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
