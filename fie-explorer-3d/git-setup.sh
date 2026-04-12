#!/bin/bash
# ================================================================
#  FIE Explorer 3D — Script de configuración inicial de Git
#  Ejecutar UNA SOLA VEZ después de clonar o crear el repositorio
#  Uso: bash git-setup.sh https://github.com/TU_USUARIO/fie-explorer-3d
# ================================================================

REPO_URL=${1:-""}

echo "=== FIE Explorer 3D — Configuración Git ==="

# Inicializar si no existe
if [ ! -d ".git" ]; then
  git init
  echo "[OK] Repositorio Git inicializado"
fi

# Configurar remote si se pasó URL
if [ -n "$REPO_URL" ]; then
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REPO_URL"
  echo "[OK] Remote origin configurado: $REPO_URL"
fi

# Commit inicial en main
git add .
git commit -m "chore: Sprint 0 — configuración inicial del entorno

- Estructura de carpetas frontend/backend
- docker-compose.yml con 3 servicios (frontend, backend, db)
- Dockerfiles multi-stage (development/production)
- .env.example documentado
- Migración SQL inicial (7 tablas + 2 vistas)
- GitHub Actions CI workflow
- README con instrucciones completas

Refs: HT-01" 2>/dev/null || git commit --allow-empty -m "chore: Sprint 0 — setup inicial"

# Crear rama develop
git checkout -b develop 2>/dev/null || git checkout develop
echo "[OK] Rama develop creada"

# Crear rama feature del sprint 0
git checkout -b feature/HT-01-setup-entorno 2>/dev/null || true
echo "[OK] Rama feature/HT-01-setup-entorno creada"

# Volver a develop
git checkout develop

echo ""
echo "=== Ramas creadas ==="
git branch -a

if [ -n "$REPO_URL" ]; then
  echo ""
  echo "Para subir al repositorio remoto:"
  echo "  git push -u origin main"
  echo "  git push -u origin develop"
fi

echo ""
echo "=== Sprint 0 listo para verificación ==="
