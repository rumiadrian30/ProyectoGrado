# FIE Explorer 3D — ESPOCH

> Explorador 3D público e interactivo de la Facultad de Informática y Electrónica.
> Grefa Rivadeneyra Rumi Adrian · Código: 7333

> ⚠️ **Este sistema es de solo lectura.**
> La gestión de contenidos (hotspots, edificios, modelos) se realiza desde **fie-admin**,
> que corre en su propio servidor y comparte la misma base de datos.

---

## Arquitectura del proyecto completo

```
fie-admin/          → Panel de administración (puerto propio, auth JWT, CRUD)
fie-explorer-3d/    → Visor público 3D       (este repositorio, solo lectura)
                         └── Misma BD PostgreSQL ← ambos apuntan aquí
```

---

## Estructura de fie-explorer-3d

```
fie-explorer-3d/
├── frontend/               # React 18 + Three.js + Vite
│   ├── public/models/      # Modelos GLB van aquí
│   └── src/
│       ├── components/
│       │   ├── viewer/     # Viewer3D, BuildingSelector, ViewerControls
│       │   ├── hotspots/   # HotspotPanel
│       │   ├── minimap/    # MiniMap (Canvas 2D)
│       │   └── ui/         # Navbar, LoadingScreen
│       ├── pages/          # Home, Explorer
│       ├── services/       # api.js, buildingsService, hotspotsService
│       ├── store/          # viewerStore (Zustand)
│       └── utils/          # three.helpers, webgl.detect
└── backend/                # Node.js + Express (GET únicamente)
    └── src/
        ├── controllers/    # buildings, hotspots, models
        ├── routes/         # GET /api/buildings, /hotspots, /models
        ├── config/         # database.js, env.js
        └── utils/          # logger (Winston)
```

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 20 LTS        |
| PostgreSQL   | 15+ con PostGIS |

---

## Instalación

### Backend

```bash
cd backend

# Variables de entorno
cp .env.example .env
# Editar: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, FRONTEND_URL

# Instalar dependencias
npm install

# Iniciar (development)
npm run dev
# → http://localhost:4000

# Verificar
curl http://localhost:4000/health
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

---

## Endpoints públicos disponibles

```
GET /health                             → Estado del servidor

GET /api/buildings                      → Lista de edificios activos
GET /api/buildings/:id                  → Edificio con modelos 3D y conteo de hotspots

GET /api/hotspots                       → Hotspots (filtros: ?building_id=&floor=&type=)
GET /api/hotspots/:id                   → Hotspot con imágenes

GET /api/models                         → Modelos 3D (filtros: ?building_id=&model_type=&lod_level=)
```

No hay endpoints de escritura — todo el CRUD lo gestiona **fie-admin**.

---

## Rutas del explorador

| Ruta                      | Descripción                                        |
|---------------------------|----------------------------------------------------|
| `/`                       | Landing page con lista de edificios                |
| `/explorar`               | Visor 3D con selector de edificio                  |
| `/explorar/:buildingId`   | Visor 3D con edificio preseleccionado              |

---

## Agregar modelos 3D GLB

1. Coloca los archivos `.glb` en `frontend/public/models/`
2. Convención de nombres:
   ```
   {codigo-edificio-lowercase}_{tipo}_lod{nivel}.glb

   Ejemplos:
   fie-main_exterior_lod0.glb
   fie-main_interior_lod0.glb
   fie-lab-ea_exterior_lod0.glb
   ```
3. Registra el modelo en la BD desde **fie-admin** (panel de modelos) o SQL directo.

> Sin archivos GLB el visor muestra una **escena de demostración** automáticamente.

---

## Variables de entorno (.env)

| Variable             | Descripción                        | Default              |
|----------------------|------------------------------------|----------------------|
| `PORT`               | Puerto del servidor API            | `4000`               |
| `NODE_ENV`           | development / production           | `development`        |
| `DB_HOST`            | Host PostgreSQL                    | `localhost`          |
| `DB_PORT`            | Puerto PostgreSQL                  | `5432`               |
| `DB_NAME`            | Nombre de la base de datos         | `fie_explorer_3d`    |
| `DB_USER`            | Usuario PostgreSQL                 | `postgres`           |
| `DB_PASSWORD`        | Contraseña PostgreSQL              | —                    |
| `FRONTEND_URL`       | URL del frontend (CORS)            | `http://localhost:5173` |
| `RATE_LIMIT_MAX`     | Máx. peticiones por ventana        | `100`                |

---

## Tecnologías

**Frontend:** React 18, Three.js r160, Vite 5, Zustand, Axios, React Router v6

**Backend:** Node.js 20, Express 4, PostgreSQL 15 + PostGIS, Winston, Helmet, express-rate-limit

---

## Autor

**Grefa Rivadeneyra Rumi Adrian** · Código: 7333
Facultad de Informática y Electrónica — ESPOCH
Proyecto de Titulación: *Exploración Tridimensional FIE* · v1.0 · 2026
