# FIE Explorer 3D — ESPOCH

> Explorador tridimensional interactivo de la Facultad de Informática y Electrónica.
> Grefa Rivadeneyra Rumi Adrian · Código: 7333

---

## Estructura del proyecto

```
fie-explorer-3d/
├── frontend/          # React 18 + Three.js + Vite
├── backend/           # Node.js + Express + PostgreSQL
├── docker-compose.yml # Orquestación completa
└── fie_explorer_3d_database.sql  # ← copiar aquí para Docker
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 20 LTS        |
| npm         | 10+           |
| PostgreSQL  | 15+ con PostGIS |
| pgAdmin 4   | Cualquier versión reciente |

---

## Instalación manual (sin Docker)

### 1. Base de datos

1. Abre **pgAdmin 4**
2. Crea una base de datos vacía llamada `fie_explorer_3d`
3. Abre el **Query Tool** sobre esa base de datos
4. Pega y ejecuta el contenido de `fie_explorer_3d_database.sql`
5. Verifica el mensaje de éxito en la consola de pgAdmin

### 2. Backend

```bash
cd backend

# Copia y edita variables de entorno
cp .env.example .env
# Edita DB_PASSWORD, JWT_SECRET, etc.

# Instala dependencias
npm install

# Crea el usuario administrador inicial
node db/seeds/create_admin.js

# Inicia en modo desarrollo (con hot reload)
npm run dev
```

El API queda disponible en: **http://localhost:4000**

> Verifica la salud del servidor:
> ```
> GET http://localhost:4000/health
> ```

### 3. Frontend

```bash
cd frontend

# Instala dependencias
npm install

# Inicia en modo desarrollo
npm run dev
```

La aplicación queda disponible en: **http://localhost:5173**

---

## Instalación con Docker (recomendado)

```bash
# Desde la raíz del proyecto (donde está docker-compose.yml)
# IMPORTANTE: copia el archivo SQL a la raíz
cp /ruta/al/fie_explorer_3d_database.sql .

# Levanta todos los servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Crear admin (solo la primera vez)
docker compose exec backend node db/seeds/create_admin.js
```

Servicios disponibles:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432

---

## Credenciales por defecto

| Campo    | Valor                        |
|----------|------------------------------|
| Email    | `admin@espoch.edu.ec`        |
| Password | `FIE_Admin_2026!`            |
| Panel    | http://localhost:5173/admin  |

> ⚠️ **Cambia la contraseña** inmediatamente después del primer login en producción.

---

## Rutas de la aplicación

| Ruta                    | Descripción                              |
|-------------------------|------------------------------------------|
| `/`                     | Landing page con lista de edificios      |
| `/explorar`             | Visor 3D (selector de edificio)          |
| `/explorar/:buildingId` | Visor 3D con edificio preseleccionado    |
| `/admin/login`          | Login administrativo                     |
| `/admin`                | Panel de gestión (protegido)             |

---

## Endpoints del API

### Públicos

```
GET  /health                        → Estado del servidor
GET  /api/buildings                 → Lista de edificios activos
GET  /api/buildings/:id             → Edificio con sus modelos y conteo de hotspots
GET  /api/hotspots                  → Lista de hotspots (filtros: building_id, floor, type)
GET  /api/hotspots/:id              → Hotspot con imágenes
GET  /api/models                    → Modelos 3D (filtros: building_id, model_type, lod_level)
```

### Protegidos (requieren `Authorization: Bearer <token>`)

```
POST /api/auth/login                → Login → devuelve token JWT
GET  /api/auth/me                   → Datos del admin autenticado
POST /api/auth/logout               → Logout (registra en audit_log)

POST /api/buildings                 → Crear edificio
PUT  /api/buildings/:id             → Actualizar edificio

POST /api/hotspots                  → Crear hotspot
PUT  /api/hotspots/:id              → Actualizar hotspot
DEL  /api/hotspots/:id              → Desactivar hotspot (soft delete)

POST /api/models                    → Registrar modelo 3D
```

---

## Agregar modelos 3D GLB

1. Coloca tus archivos `.glb` en `frontend/public/models/`
2. Sigue la convención de nombres:
   ```
   {CODIGO_EDIFICIO_LOWERCASE}_{tipo}_lod{nivel}.glb
   ```
   Ejemplos:
   ```
   fie-main_exterior_lod0.glb    ← exterior alta resolución
   fie-main_exterior_lod1.glb    ← exterior media resolución
   fie-main_interior_lod0.glb    ← interior
   fie-lab-ea_exterior_lod0.glb
   ```
3. Registra el modelo en la BD (vía panel admin o SQL directo):
   ```sql
   INSERT INTO models_3d (building_id, model_type, file_path, lod_level)
   VALUES (
     '<uuid-del-edificio>',
     'exterior',
     '/models/fie-main_exterior_lod0.glb',
     0
   );
   ```

> Sin archivos GLB, el visor muestra una **escena de demostración** con bloques 3D de colores representando cada edificio.

---

## Agregar hotspots

### Desde el panel admin (recomendado)
1. Ir a **http://localhost:5173/admin**
2. Pestaña **Hotspots → Nuevo hotspot**
3. Seleccionar edificio, ingresar nombre, tipo y coordenadas 3D

### Coordenadas 3D
Las coordenadas `pos_x`, `pos_y`, `pos_z` corresponden al espacio Three.js del modelo.
- Usa la consola del navegador para obtenerlas explorando el modelo.
- Con `OrbitControls`, el eje Y es la altura.

---

## Variables de entorno del backend

| Variable              | Descripción                           | Default           |
|-----------------------|---------------------------------------|-------------------|
| `PORT`                | Puerto del servidor API               | `4000`            |
| `NODE_ENV`            | Entorno (development/production)      | `development`     |
| `DB_HOST`             | Host de PostgreSQL                    | `localhost`       |
| `DB_PORT`             | Puerto de PostgreSQL                  | `5432`            |
| `DB_NAME`             | Nombre de la base de datos            | `fie_explorer_3d` |
| `DB_USER`             | Usuario de PostgreSQL                 | `postgres`        |
| `DB_PASSWORD`         | Contraseña de PostgreSQL              | —                 |
| `JWT_SECRET`          | Secreto para firmar tokens JWT        | —                 |
| `JWT_EXPIRES_IN`      | Duración del token                    | `8h`              |
| `FRONTEND_URL`        | URL del frontend (para CORS)          | `http://localhost:5173` |
| `RATE_LIMIT_MAX`      | Máx. peticiones por ventana           | `100`             |

---

## Tecnologías

### Frontend
- **React 18** — UI components
- **Three.js r160** + **@react-three/fiber** — Renderizado 3D
- **Vite 5** — Build tool
- **Zustand** — State management
- **Axios** — HTTP client
- **Framer Motion** — Animaciones
- **React Router v6** — Enrutamiento

### Backend
- **Node.js 20** + **Express 4** — Servidor API REST
- **PostgreSQL 15** + **PostGIS** — Base de datos con soporte geoespacial
- **bcrypt** — Hash de contraseñas
- **jsonwebtoken** — Autenticación JWT
- **Helmet** — Headers de seguridad HTTP
- **express-rate-limit** — Protección contra abuso
- **Winston** — Logging estructurado

---

## Autor

**Grefa Rivadeneyra Rumi Adrian**  
Código: 7333  
Facultad de Informática y Electrónica — ESPOCH  
Proyecto de Titulación: *Exploración Tridimensional FIE*  
Versión: 1.0 · 2026
