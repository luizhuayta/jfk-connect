/**
 * Hashing seguro de contraseñas para IJFK
 *
 * Antes se usaba SHA-256 con un salt estático (`ijfk-salt-${password}`), lo cual
 * es inseguro: es un hash rápido (vulnerable a brute-force/GPU) y sin salt único
 * por usuario, por lo que contraseñas iguales producen hashes iguales
 * (rainbow tables).
 *
 * Ahora usamos Node `scrypt` (PBKDF2-based, diseñado para ser costoso de
 * atacar) con un salt aleatorio por contraseña y formato `scrypt:salt:hash`.
 *
 * Para mantener compatibilidad con usuarios existentes, `verifyPassword`
 * detecta el formato:
 *   - Si el hash empieza con "scrypt$" → verificación nueva
 *   - Si no → verificación legacy (SHA-256 con salt estático) y se puede
 *     marcar para re-hash en el próximo login.
 */

import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

/**
 * Hashea una contraseña con scrypt + salt aleatorio.
 * Devuelve el string `scrypt$<saltHex>$<hashHex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Verifica una contraseña contra un hash almacenado.
 * Soporta el formato nuevo (scrypt$...) y el legacy (SHA-256 con salt estático).
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!stored) return false;

  // Formato nuevo: scrypt$<saltHex>$<hashHex>
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
    // Comparación en tiempo constante para evitar timing attacks
    return crypto.timingSafeEqual(hash, expected);
  }

  // Legacy: SHA-256 con salt estático (inseguro, solo para compatibilidad)
  const legacy = crypto
    .createHash("sha256")
    .update(`ijfk-salt-${password}`)
    .digest("hex");
  // timingSafeEqual requiere buffers de igual longitud
  try {
    return crypto.timingSafeEqual(
      Buffer.from(legacy, "hex"),
      Buffer.from(stored, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Indica si un hash almacenado usa el formato legacy (inseguro) y debería
 * ser re-hasheado en el próximo login del usuario.
 */
export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}