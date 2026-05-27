import { encryptedSession } from './utils/encryptedStorage';

// ── URL base ─────────────────────────────────────────────────
const API = '/api';

// sessionStorage
let _token = encryptedSession.getItem('admin_token');
let _onUnauthorized = null;

// Evita multiples logout simultaneos
let _handlingUnauthorized = false;

export function setToken(t) {
  _token = t;
  encryptedSession.setItem('admin_token', t);
}

export function clearToken() {
  _token = null;
  encryptedSession.removeItem('admin_token');
  encryptedSession.removeItem('admin_user');
}

export function onUnauthorized(cb) {
  _onUnauthorized = cb;
}

// ── Fetch helper ─────────────────────────────────────────────
export async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-App': 'admin',        
    },
    credentials: 'include',
  };

  if (_token) {
    opts.headers['Authorization'] = 'Bearer ' + _token;
  }

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));

  // ── Sesión expirada ───────────────────────────────────────
  if (res.status === 401) {
    if (!_handlingUnauthorized) {
      _handlingUnauthorized = true;
      clearToken();
      _onUnauthorized?.();
      setTimeout(() => {
        _handlingUnauthorized = false;
      }, 1000);
    }
    throw Object.assign(
      new Error('Sesión expirada. Vuelve a iniciar sesión.'),
      { status: 401 }
    );
  }

  // ── Otros errores ─────────────────────────────────────────
  if (!res.ok) {
    throw Object.assign(
      new Error(data.error || 'Error en la solicitud'),
      {
        status: res.status,
        data
      }
    );
  }
  return data;
}

// ── Utilidades ──────────────────────────────────────────────
export function fmt(dt) {
  return dt
    ? String(dt).slice(0, 16).replace('T', ' ')
    : '—';
}

export function actionBadgeClass(a) {
  const m = {
    CREATE: 'b-green',
    UPDATE: 'b-blue',
    DELETE: 'b-red',
    LOGIN: 'b-teal',
    LOGOUT: 'b-gray',
    ACTIVATE: 'b-green',
    DEACTIVATE: 'b-amber',
  };
  return m[a] || 'b-gray';
}

export function severityBadgeClass(s) {
  const m = {
    DEBUG: 'b-gray',
    INFO: 'b-teal',
    WARN: 'b-amber',
    ERROR: 'b-red',
    FATAL: 'b-purple',
  };
  return m[s] || 'b-gray';
}

export function typeBadgeClass(t) {
  const m = {
    lab: 'b-blue',
    office: 'b-teal',
    service: 'b-green',
    access: 'b-gray'
  };
  return m[t] || 'b-gray';
}

// ── Helpers de cifrado ──────────────────────────────────────
export function isEncrypted(val) {
  return val === '[CIFRADO]' || val === null;
}
// ── Señal de actividad para el timer de inactividad ──────────────────────────
let _onActivity = null
export function onActivity(cb) { _onActivity = cb }
export function signalActivity()  { _onActivity?.() }