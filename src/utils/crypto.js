/**
 * Utilidad de criptografía para credenciales de demostración FIA 2026
 * Utiliza Web Crypto API (SHA-256)
 */

/**
 * Calcula el hash SHA-256 del par normalizado email:password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashCredentials(email, password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is required for authentication.');
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  const rawPayload = `${normalizedEmail}:${password}`;
  const hashBuffer = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(rawPayload)
  );

  return Array.from(new Uint8Array(hashBuffer), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

