# FIE Explorer 3D — Monorepo

Explorador 3D interactivo de la Facultad de Informática y Electrónica (FIE) — ESPOCH.

## Estructura

```
fie-explorer-3d/
├── Backend/            API REST compartida (Node.js + Express + PostgreSQL)
├── Admin Frontend/     Panel de administración (React + Vite) — puerto 5173
└── Public Frontend/    Visor 3D público       (React + Three.js + Vite) — puerto 5174
```

## Puertos

| Servicio        | Puerto |
|-----------------|--------|
| Backend API     | 3001   |
| Admin Frontend  | 5173   |
| Public Frontend | 5174   |

## Configuración

1. Copiar el archivo de entorno:
   ```bash
   cp Backend/.env.example Backend/.env
   ```
2. Editar `Backend/.env` con tus credenciales de PostgreSQL y secretos JWT.
   Si `DATABASE_URL` está definido tiene prioridad sobre `DB_HOST`/`DB_NAME`/…

## Desarrollo local

Iniciar cada servicio en terminales separadas:

```bash
# Backend
cd Backend && npm install && npm run dev

# Admin Frontend
cd "Admin Frontend" && npm install && npm run dev

# Public Frontend
cd "Public Frontend" && npm install && npm run dev
```

## Docker

```bash
docker compose up --build
```

## Modelos 3D optimizados

Los `.glb` fotogramétricos pesan decenas de MB casi por completo por sus
texturas PNG. El backend los optimiza automáticamente al subirlos desde el
panel de administración (`utils/glbOptimizer.js`):

| Paso | Efecto |
|------|--------|
| Texturas → WebP (máx. 2048 px, calidad 80) | 5–10× menos peso, sin pérdida visible |
| `weld` + `dedup` + `prune` + `EXT_meshopt_compression` | geometría compacta; el decodificador va incluido en Three.js |
| Simplificación de mallas > 600 k triángulos | p. ej. 1,48 M → 600 k |
| Se eliminan `KHR_materials_specular` / `KHR_materials_ior` | shaders más baratos (MeshStandardMaterial) |

Resultado en el campus actual: **196 MB → 20 MB** (el edificio principal pasó de 43 MB a 6,8 MB).

Para optimizar los archivos ya existentes en el servidor:

```bash
cd Backend
npm run optimize:models            # uploads/models (o MODELS_DIR)
npm run optimize:models -- --force # re-optimizar aunque ya tengan marcador
npm run optimize:models -- --no-db # no actualizar file_size_mb en la BD
```

Los originales quedan en `Backend/uploads/models-original/` (ignorado por git).
Variables opcionales: `GLB_OPTIMIZE=false` desactiva la optimización al subir;
`GLB_MAX_TEXTURE` y `GLB_TEXTURE_QUALITY` ajustan las texturas.

Los modelos con timestamp en el nombre se sirven con `Cache-Control: immutable`
(un año); `mapa-espoch.glb` mantiene 1 h.

## Visor 3D público

`Public Frontend/src/components/viewer/`:

```
CampusViewer3D.jsx      contenedor: canvas, calidad por dispositivo, modo interior, HUD
scene/Scene3D.jsx       cielo, luces, terreno, edificios, pines, cámara y navegación
scene/CameraRig.jsx     vuelos suaves, encuadre por bounding box, vista inicial, recorrido
scene/BuildingEntry.jsx carga por proximidad, proxy de raycast, resaltado, error boundary
scene/InteriorHotspotMarkers.jsx  marcadores 3D de hotspots (cámaras Cam_Interior_*)
hud/                    botonera, barra de progreso real, insignias, diálogos
```

Controles (exterior): clic izquierdo desplaza, clic derecho rota, rueda hace zoom,
doble clic centra la vista en un punto, `W A S D` mueve, `Q/E` gira, `Shift` acelera.
Interior: arrastrar mira alrededor, `W A S D` camina, rueda avanza, `Esc` sale.

Perfil de calidad: automático (sombras y DPR altos en escritorio; en móvil se
reducen y se activa la carga por proximidad). Se puede forzar con
`?calidad=alta` o `?calidad=baja` en la URL.

## Roles de rutas del Backend

| Ruta                      | Público | Admin (JWT) |
|---------------------------|---------|-------------|
| GET  /api/buildings       | Ok      |             |
| PUT  /api/buildings/:id   |         | Ok          |
| GET  /api/hotspots        | Ok      |             |
| POST/PUT/DELETE /api/hotspots/:id |  | Ok        |
| GET  /api/models          | Ok      |             |
| POST/PUT/DELETE /api/models/:id   |  | Ok        |
| /api/auth                 | Ok      |             |
| /api/audit-logs           |         | Ok          |
| /api/error-logs           |         | Ok          |
| /api/admin-users          |         | Ok          |
| /api/settings             |         | Ok          |
| /api/encryption           |         | Ok          |
| /api/images               |         | Ok          |
