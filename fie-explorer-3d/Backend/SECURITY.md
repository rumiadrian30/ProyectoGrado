# HT-10 — Seguridad: Cabeceras HTTP, Sanitización y Gaussian Blur
## FIE Explorer 3D — ESPOCH | Sprint 4

---

## 1. Cabeceras HTTP de seguridad (Helmet v8)

### Configuración implementada en `server.js`

| Cabecera | Valor configurado | Propósito |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; ...` | Previene XSS e inyección de scripts externos no autorizados |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` *(producción)* | Fuerza HTTPS en todos los dominios durante 1 año |
| `X-Frame-Options` | `DENY` | Previene clickjacking — la UI no puede embeberse en iframe |
| `X-Content-Type-Options` | `nosniff` | Impide que el navegador "adivine" el MIME type |
| `X-XSS-Protection` | `1; mode=block` | Activa filtro XSS en IE/Edge legacy |
| `Referrer-Policy` | `no-referrer` | No filtra la URL origen a recursos externos |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Desactiva APIs de hardware no requeridas |
| `Cross-Origin-Opener-Policy` | `same-origin` | Aísla la ventana de orígenes cruzados |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Permite al frontend cargar imágenes/modelos correctamente |

### Resultado esperado en SecurityHeaders.com

```
URL analizada: https://fie-explorer.espoch.edu.ec

✅  Content-Security-Policy      → PRESENTE
✅  Strict-Transport-Security    → PRESENTE (max-age=31536000; includeSubDomains; preload)
✅  X-Frame-Options              → DENY
✅  X-Content-Type-Options       → nosniff
✅  Referrer-Policy              → no-referrer
✅  Permissions-Policy           → PRESENTE

Calificación esperada: A  (≥ B requerido por criterio de aceptación)
```

> **Nota para la demo:** Ejecutar `securityheaders.com/?q=https://fie-explorer.espoch.edu.ec&followRedirects=on`
> en el navegador del evaluador. En entorno local (HTTP) HSTS no aplica, pero el resto de cabeceras
> son verificables con la pestaña **Network → Response Headers** de DevTools.

---

## 2. Sanitización de entradas (XSS) — verificación con OWASP ZAP

### Medidas implementadas

| Capa | Mecanismo | Dónde |
|---|---|---|
| **Backend** | Validación con `?.trim()`, chequeo de tipos en cada controller | `hotspotController.js`, `adminUserController.js`, `authController.js` |
| **Backend** | Consultas parametrizadas (`$1, $2, …` con `pg`) — previene SQL Injection | Todos los controllers |
| **Backend** | `express-rate-limit` — previene fuerza bruta en `/api/auth/login` | `server.js` |
| **Frontend** | React escapa automáticamente todo contenido renderizado vía JSX | Todos los componentes |
| **Frontend** | Sin `dangerouslySetInnerHTML` en ningún componente | Verificado en código fuente |

### Prueba con OWASP ZAP — Procedimiento

```bash
# 1. Lanzar OWASP ZAP (GUI o Docker)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://fie-explorer.espoch.edu.ec \
  -r zap-report.html

# 2. Prueba manual de XSS en endpoint de hotspots
curl -X POST https://fie-explorer.espoch.edu.ec/api/hotspots \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<JWT_VALIDO>" \
  -d '{
    "building_id": 1,
    "name": "<script>alert(1)</script>",
    "type": "lab"
  }'

# Resultado esperado:
# → El campo name se almacena como texto plano (no ejecutado)
# → React lo renderiza escapado: &lt;script&gt;alert(1)&lt;/script&gt;
# → No hay ejecución de código en el navegador
```

### Vectores XSS probados

| Vector | Endpoint | Resultado esperado |
|---|---|---|
| `<script>alert(1)</script>` en `name` | `POST /api/hotspots` | Almacenado como texto, escapado en UI |
| `"><img src=x onerror=alert(1)>` en `description` | `POST /api/hotspots` | Almacenado como texto, escapado en UI |
| `'; DROP TABLE hotspots; --` | `POST /api/hotspots` | Rechazado por query parametrizada |
| `javascript:alert(1)` en `url` (imagen) | `POST /api/images` | Requiere validación de URL — recomendación: validar esquema `http/https` |

---

## 3. Gaussian Blur en texturas con personas/vehículos (HT-10)

### Implementación

**Archivo:** `Public Frontend/src/utils/texturePrivacyBlur.js`

El sistema aplica desenfoque gaussiano (3× box-blur apilados, complejidad O(n)) a regiones
rectangulares de texturas de modelos 3D que puedan contener imágenes de personas o vehículos.

```javascript
// Uso en Viewer3D.jsx — zona de calle (tercio inferior de la textura)
const privacyZones = [
  { x: 0, y: 0.65, width: 1, height: 0.35, unit: 'uv', sigma: 14 }
];

// Se aplica automáticamente al cargar el modelo GLB
blurModelTextures(model, privacyZones, { mapKeys: ['map'] });
```

### Zonas predefinidas disponibles

| Constante | Descripción | Uso recomendado |
|---|---|---|
| `AUTO_ZONES.GROUND_LEVEL` | Tercio inferior de la textura (y: 0.65–1.0) | Texturas de fachadas con calle visible |
| `AUTO_ZONES.PARKING_AREA` | Mitad inferior-izquierda (y: 0.70–1.0, x: 0–0.5) | Texturas con estacionamiento |
| `AUTO_ZONES.FULL_BLUR`    | Textura completa (sigma 18) | Máxima privacidad |
| `AUTO_ZONES.NONE`         | Sin desenfoque | Texturas sin personas/vehículos |

### Parámetro `sigma`

| Valor sigma | Intensidad del desenfoque | Uso |
|---|---|---|
| 6–10 | Leve — figuras reconocibles | No recomendado para privacidad |
| 12–16 | **Moderado** — figuras no identificables | ✅ Recomendado para fachadas |
| 18–24 | Fuerte — zona completamente difuminada | Zonas muy sensibles |

### Demo en vivo

En el visor 3D, al cargar un modelo GLB con texturas fotorrealistas:
1. La textura se carga normalmente.
2. Tras la carga, `blurModelTextures` aplica el desenfoque en las zonas definidas.
3. El resultado se actualiza en Three.js vía `THREE.CanvasTexture` sin recargar la página.
4. Las zonas difuminadas se pueden ajustar en tiempo real pasando distintas `privacyZones` como prop.

---

## 4. Checklist de criterios de aceptación (HT-10)

| Criterio | Estado | Evidencia |
|---|---|---|
| SecurityHeaders.com ≥ grado B | ✅ Implementado (espera verificación en producción) | Configuración Helmet en `server.js` |
| OWASP ZAP — XSS básico bloqueado | ✅ Sanitización en controllers + React escaping | `hotspotController.js`, JSX |
| Texturas exteriores con desenfoque en zonas con personas/vehículos | ✅ Implementado | `texturePrivacyBlur.js` + `Viewer3D.jsx` |
| HTTPS en producción | ✅ HSTS configurado (activado en `NODE_ENV=production`) | `server.js` → helmet HSTS |
| Rate limiting en login | ✅ 20 req/15min por IP | `server.js` → express-rate-limit |

---

## 5. Instalación de dependencias nuevas

```bash
cd fie-explorer-3d/Backend
npm install helmet express-rate-limit swagger-ui-express
```

El frontend no requiere dependencias adicionales — `texturePrivacyBlur.js` usa únicamente
la Canvas API nativa del navegador y Three.js (ya incluido).
