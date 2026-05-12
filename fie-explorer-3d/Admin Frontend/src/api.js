// ── URL base: usa el proxy de Vite → evita CORS ──────────────
const API = '/api';

// sessionStorage: persiste en refresh, se limpia al cerrar el navegador
let _token = sessionStorage.getItem('admin_token');
let _onUnauthorized = null;

export function setToken(t) {
  _token = t;
  sessionStorage.setItem('admin_token', t);
}
export function clearToken() {
  _token = null;
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_user');
}

export function onUnauthorized(cb) {
  _onUnauthorized = cb;
}

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

  // Sesión expirada o token inválido → logout automático
  if (res.status === 401) {
    clearToken();
    _onUnauthorized?.();
    throw Object.assign(new Error('Sesión expirada. Vuelve a iniciar sesión.'), { status: 401 });
  }

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
