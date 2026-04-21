// ── URL base: usa el proxy de Vite → evita CORS ──────────────
const API = '/api';

// Token guardado en memoria (igual que el HTML original)
let _token = null;

export function setToken(t) { _token = t;    }
export function clearToken() { _token = null; }

// ── fetch helper idéntico al del HTML ────────────────────────
export async function api(method, path, body) {
  const opts = {
    method,
    headers:     { 'Content-Type': 'application/json' },
    credentials: 'include',   // cookies HttpOnly del JWT
  };
  if (_token) opts.headers['Authorization'] = 'Bearer ' + _token;
  if (body)   opts.body = JSON.stringify(body);

  const res  = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw Object.assign(
      new Error(data.error || 'Error en la solicitud'),
      { status: res.status, data }
    );
  }
  return data;
}

// ── Utilidades ───────────────────────────────────────────────
export function fmt(dt) {
  return dt ? String(dt).slice(0, 16).replace('T', ' ') : '—';
}

export function actionBadgeClass(a) {
  const m = {
    CREATE: 'b-green', UPDATE: 'b-blue',   DELETE: 'b-red',
    LOGIN:  'b-teal',  LOGOUT: 'b-gray',   ACTIVATE: 'b-green',
    DEACTIVATE: 'b-amber',
  };
  return m[a] || 'b-gray';
}

export function severityBadgeClass(s) {
  const m = {
    DEBUG: 'b-gray', INFO: 'b-teal', WARN: 'b-amber',
    ERROR: 'b-red',  FATAL: 'b-purple',
  };
  return m[s] || 'b-gray';
}

export function typeBadgeClass(t) {
  const m = { lab: 'b-blue', office: 'b-teal', service: 'b-green', access: 'b-gray' };
  return m[t] || 'b-gray';
}

// ── Helpers de cifrado ────────────────────────────────────────
export function isEncrypted(val) {
  return val === '[CIFRADO]' || val === null;
}
