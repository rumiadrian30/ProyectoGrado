# FIE Explorer 3D

**Aplicación web interactiva para la exploración tridimensional de la Facultad de Informática y Electrónica (FIE) de la ESPOCH mediante modelos fotogramétricos.**

| | |
|---|---|
| **Autor** | Grefa Rivadeneyra Rumi Adrian · Código 7333 |
| **Director** | Ing. Cristian Alexis García Pumagualle |
| **Institución** | ESPOCH — Carrera de Software |
| **Tecnologías** | React 18 · Three.js · Node.js · PostgreSQL + PostGIS · Docker |

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Docker Desktop | 24+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | 2.40+ | `git --version` |
| Node.js (opcional, dev local) | 18 LTS | `node --version` |

---

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/fie-explorer-3d.git
cd fie-explorer-3d

# 2. Crear el archivo de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de entorno)

# 3. Levantar los 3 servicios
docker-compose up --build

# 4. Verificar que todo funciona
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000/api
# Health:   http://localhost:4000/health
```

---

## Estructura del proyecto

```
fie-explorer-3d/
├── frontend/                  # React 18 + Vite 5 + Three.js
│   ├── src/
│   │   ├── components/        # Visor 3D, hotspots, minimap, admin
│   │   ├── hooks/             # useThreeScene, useGLTFLoader...
│   │   ├── pages/             # Explorer, Admin
│   │   ├── services/          # Llamadas a la API REST
│   │   ├── store/             # Estado global (Zustand)
│   │   └── utils/             # Helpers Three.js, detección WebGL
│   ├── Dockerfile
│   └── vite.config.js
│
├── backend/                   # Node.js 18 + Express 4
│   ├── src/
│   │   ├── config/            # BD, JWT, entorno
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── middleware/        # Auth JWT, rate limit, error handler
│   │   ├── routes/            # Endpoints REST
│   │   ├── services/          # Servicios (audit, hotspot...)
│   │   └── utils/             # Logger, errorLogger, validators
│   ├── db/
│   │   ├── migrations/        # SQL de creación (001-007)
│   │   └── seeds/             # Datos iniciales
│   ├── Dockerfile
│   ├── app.js
│   └── server.js
│
├── docker-compose.yml         # Orquestación de los 3 servicios
├── .env.example               # Plantilla de variables de entorno
├── .gitignore
└── README.md
```

---

## Servicios Docker

| Servicio | Puerto host | Descripción |
|----------|-------------|-------------|
| `fie_frontend` | 5173 | React + Vite (HMR en desarrollo) |
| `fie_backend` | 4000 | Node.js + Express (API REST) |
| `fie_db` | 5432 | PostgreSQL 16 + PostGIS 3.4 |

### Comandos útiles

```bash
# Levantar en background
docker-compose up -d

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar contenedores Y volúmenes (reset de BD)
docker-compose down -v

# Reconstruir solo un servicio
docker-compose up --build backend

# Conectarse a la BD desde el host (requiere psql instalado)
psql -h localhost -p 5432 -U fie_user -d fie_explorer_3d
```

---

## Variables de entorno

Ver `.env.example` para la documentación completa. Variables críticas:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `POSTGRES_PASSWORD` | Contraseña de la BD | `fie_secret` (**cambiar en producción**) |
| `JWT_SECRET` | Clave para firmar tokens | Generar con `node -e "require('crypto').randomBytes(48).toString('hex')"` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:5173` |
| `VITE_API_URL` | URL de la API para el cliente | `http://localhost:4000/api` |

---

## Ramas de Git

| Rama | Propósito |
|------|-----------|
| `main` | Código estable — solo merge desde `develop` vía PR |
| `develop` | Integración continua — merges de feature branches |
| `feature/*` | Desarrollo de funcionalidades individuales |

### Flujo de trabajo

```bash
# Crear una nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/CU-01-visor-exterior

# ... trabajo ...

git add .
git commit -m "feat: implementar carga de modelo GLB exterior (CU-01)"
git push origin feature/CU-01-visor-exterior

# Abrir Pull Request hacia develop en GitHub
```

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de error
docs:     cambios en documentación
style:    formato, sin cambio de lógica
refactor: reestructuración de código
test:     agregar o modificar pruebas
chore:    tareas de mantenimiento
```

---

## Verificación del Sprint 0

Ejecutar estos comandos y confirmar que todos pasan:

```bash
# 1. Los 3 servicios levantan correctamente
docker-compose up --build
# Esperado: fie_frontend, fie_backend, fie_db corriendo

# 2. Frontend responde
curl http://localhost:5173
# Esperado: HTML de la app React

# 3. Backend health check
curl http://localhost:4000/health
# Esperado: {"status":"ok","service":"fie-explorer-3d-backend",...}

# 4. API raíz
curl http://localhost:4000/api
# Esperado: {"message":"FIE Explorer 3D API v1.0",...}

# 5. Ramas de Git
git branch -a
# Esperado: main, develop, feature/HT-01-setup-entorno (o similar)
```

---

## Créditos

Proyecto desarrollado como Trabajo de Titulación en la **Carrera de Software**, **Facultad de Informática y Electrónica**, **Escuela Superior Politécnica de Chimborazo (ESPOCH)**, Riobamba — Ecuador, 2026.
