/**
 * encryptedStorage.js
 * Admin Frontend/src/utils/encryptedStorage.js
 *
 * Adaptador de sessionStorage cifrado con AES-256 (crypto-js).
 * El Admin Frontend usa sessionStorage para:
 *   · admin_token  — JWT de autenticación
 *   · admin_user   — datos del usuario logueado (rol, email, nombre)
 *
 * Al cifrar estos valores, un atacante con acceso físico al navegador
 * no puede leer el token ni el perfil directamente desde DevTools.
 *
 * La clave AES se lee de VITE_STORAGE_SECRET (variable de entorno).
 * Sin la variable el adaptador opera en modo transparente (sin cifrado)
 * para no romper el flujo en desarrollo sin .env configurado.
 *
 * Instalación previa:
 *   cd "Admin Frontend" && npm install crypto-js
 *
 * Variable requerida en Admin Frontend/.env:
 *   VITE_STORAGE_SECRET=fie_explorer_aes_key_2026
 */

import CryptoJS from 'crypto-js';

const KEY = import.meta.env.VITE_STORAGE_SECRET;

if (!KEY) {
  console.warn(
    '[encryptedStorage] VITE_STORAGE_SECRET no está definido.\n' +
    'El sessionStorage se guardará sin cifrar. ' +
    'Añade la variable en Admin Frontend/.env para activar el cifrado.'
  );
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function encrypt(plainText) {
  if (!KEY || !plainText) return plainText;
  return CryptoJS.AES.encrypt(String(plainText), KEY).toString();
}

function decrypt(cipherText) {
  if (!KEY || !cipherText) return cipherText;
  try {
    const bytes  = CryptoJS.AES.decrypt(cipherText, KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || null; // vacío → dato corrupto o clave incorrecta
  } catch {
    return null;
  }
}

// ─── API pública — misma interfaz que sessionStorage ─────────────────────────

export const encryptedSession = {
  /**
   * Lee y descifra un valor de sessionStorage.
   * Retorna null si la clave no existe o si el descifrado falla.
   */
  getItem(key) {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return decrypt(raw);
  },

  /**
   * Cifra el valor y lo guarda en sessionStorage.
   */
  setItem(key, value) {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, encrypt(String(value)));
  },

  /**
   * Elimina la clave (sin necesidad de descifrar).
   */
  removeItem(key) {
    sessionStorage.removeItem(key);
  },
};