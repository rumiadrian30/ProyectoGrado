/**
 * encryptedStorage.js
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
    return result || null;
  } catch {
    return null;
  }
}

// ─── API publica  ─────────────────────────
export const encryptedSession = {
  getItem(key) {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return decrypt(raw);
  },

  // Cifra el valor y lo guarda en sessionStorage
  setItem(key, value) {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, encrypt(String(value)));
  },

   // Elimina la clave
  removeItem(key) {
    sessionStorage.removeItem(key);
  },
};