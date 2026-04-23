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
