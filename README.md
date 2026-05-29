# GeoESPOCH 3D — ESPOCH

> Explorador tridimensional interactivo de la Facultad de Informática y Electrónica.
> Grefa Rivadeneyra Rumi Adrian · Código: 7333

---

## Estructura del proyecto

```
fie-explorer-3d/
├── Backend/            API REST compartida (Node.js + Express + PostgreSQL)
├── Admin Frontend/     Panel de administración (React + Vite) — puerto 5173
└── Public Frontend/    Visor 3D público       (React + Three.js + Vite) — puerto 5174
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
Proyecto de Titulación: *GeoESPOCH 3D*  
Versión: 4.0 · 2026
