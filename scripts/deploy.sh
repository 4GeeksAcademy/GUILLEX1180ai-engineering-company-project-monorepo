#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# deploy.sh — Despliegue completo de TrackFlow
# Uso: bash deploy.sh [entorno]
#   entorno: dev (default), staging, production
#
# Requisitos previos:
#   - Python 3.12+ con virtualenv creado
#   - Node.js 22+
#   - npm dependencies instaladas (npm ci)
#   - Archivo .env configurado en la raíz
# ──────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-dev}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${REPO_ROOT}/logs/deploy_${ENV}_${TIMESTAMP}.log"
BACKUP_DIR="${REPO_ROOT}/backups/${TIMESTAMP}"

mkdir -p "$(dirname "$LOG_FILE")" "$BACKUP_DIR/backoffice"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
bail() { log "❌ ERROR: $*"; exit 1; }

log "============================================"
log "  TrackFlow Deploy — Entorno: $ENV"
log "  Repositorio: $REPO_ROOT"
log "  Timestamp:   $TIMESTAMP"
log "============================================"

# ── Backup Pre-Despliegue ────────────────────────────────
log ">>> Creando backup pre-despliegue en $BACKUP_DIR"
[ -f "${REPO_ROOT}/.env" ]               && cp "${REPO_ROOT}/.env" "${BACKUP_DIR}/"
[ -f "${REPO_ROOT}/uis/backoffice/.env.local" ] && cp "${REPO_ROOT}/uis/backoffice/.env.local" "${BACKUP_DIR}/backoffice/"
[ -f "${REPO_ROOT}/src/db_users.json" ]  && cp "${REPO_ROOT}/src/db_users.json" "${BACKUP_DIR}/"
[ -d "${REPO_ROOT}/dist" ]               && cp -a "${REPO_ROOT}/dist" "${BACKUP_DIR}/"
[ -d "${REPO_ROOT}/uis/backoffice/.next" ] && cp -a "${REPO_ROOT}/uis/backoffice/.next" "${BACKUP_DIR}/backoffice/"
git tag "deploy_pre_${TIMESTAMP}" HEAD 2>/dev/null || true
log "  ✅ Backup completado"

# ──────────────────────────────────────────────────────────
# Fase 1: Backend API (FastAPI)
# ──────────────────────────────────────────────────────────
deploy_api() {
    log "\n━━━ [1/3] Backend API ━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$REPO_ROOT"

    # Validar .env
    [ -f ".env" ] || bail ".env no encontrado. Copia .env.example a .env"

    # Activar virtualenv
    if [ ! -d ".venv" ]; then
        log "  Creando virtualenv Python..."
        python3 -m venv .venv || python3.12 -m venv .venv || bail "No se pudo crear virtualenv"
    fi
    source .venv/bin/activate

    log "  Instalando dependencias Python..."
    pip install -q -e . 2>/dev/null || pip install -q fastapi uvicorn[standard] python-dotenv python-jose[cryptography] passlib[bcrypt] bcrypt email-validator python-multipart tinydb

    # Iniciar servidor
    if command -v systemctl &>/dev/null && [ "$ENV" != "dev" ]; then
        log "  Recargando servicio trackflow-api (systemd)..."
        sudo systemctl restart trackflow-api || bail "systemctl restart trackflow-api falló"
    else
        log "  Iniciando servidor de desarrollo Uvicorn..."
        kill "$(lsof -t -i:8000)" 2>/dev/null || true
        nohup uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload \
            > "${REPO_ROOT}/logs/api_${ENV}.log" 2>&1 &
        log "  PID: $!"
    fi

    # Health check
    sleep 4
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        log "  ✅ API respondiendo en http://localhost:8000"
    else
        bail "API no responde después del despliegue"
    fi
}

# ──────────────────────────────────────────────────────────
# Fase 2: Backoffice (Next.js)
# ──────────────────────────────────────────────────────────
deploy_backoffice() {
    log "\n━━━ [2/3] Backoffice ━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "${REPO_ROOT}/uis/backoffice"

    [ -f ".env.local" ] || log "  ⚠️  .env.local no encontrado — usando defaults"

    log "  Instalando dependencias npm..."
    npm ci --silent 2>/dev/null || npm install --silent

    log "  Type-checking TypeScript..."
    npx tsc --noEmit || log "  ⚠️  TypeScript type-check tiene advertencias"

    log "  Build de producción..."
    npm run build || bail "Build de Next.js falló"

    # Iniciar servidor
    if command -v systemctl &>/dev/null && [ "$ENV" != "dev" ]; then
        log "  Recargando servicio trackflow-backoffice (systemd)..."
        sudo systemctl restart trackflow-backoffice || bail "systemctl restart trackflow-backoffice falló"
    else
        log "  Iniciando servidor de desarrollo Next.js..."
        kill "$(lsof -t -i:3001)" 2>/dev/null || true
        nohup npm run start -- --port 3001 \
            > "${REPO_ROOT}/logs/backoffice_${ENV}.log" 2>&1 &
        log "  PID: $!"
    fi

    # Health check
    sleep 8
    if curl -sfL http://localhost:3001/login > /dev/null 2>&1; then
        log "  ✅ Backoffice respondiendo en http://localhost:3001"
    else
        bail "Backoffice no responde después del despliegue"
    fi
}

# ──────────────────────────────────────────────────────────
# Fase 3: Landing + Páginas Públicas (Vite)
# ──────────────────────────────────────────────────────────
deploy_landing() {
    log "\n━━━ [3/3] Landing + Páginas Públicas ━━━━━━━━━"
    cd "$REPO_ROOT"

    log "  Type-checking TypeScript raíz..."
    npx tsc --noEmit || log "  ⚠️  TypeScript type-check tiene advertencias"

    log "  Build de producción Vite..."
    npm run build || bail "Build de Vite falló"

    # Verificar archivos generados
    local pages=0
    for f in dist/index.html dist/application.html dist/console.html; do
        if [ -f "$f" ]; then
            pages=$((pages + 1))
            log "  ✅ ${f#dist/}"
        else
            log "  ⚠️  ${f#dist/} no generado — ¿se eliminó del source?"
        fi
    done
    log "  📄 $pages página(s) generada(s)"

    # Si hay Nginx, recargar
    if command -v nginx &>/dev/null && [ "$ENV" != "dev" ]; then
        log "  Recargando Nginx..."
        sudo nginx -t && sudo systemctl reload nginx || log "  ⚠️  Nginx reload falló — verificar configuración manualmente"
    fi

    log "  ✅ Build completado en dist/"
    log "     Para probar local: npx vite preview --port 3000"
}

# ──────────────────────────────────────────────────────────
# Fase 4: Smoke Tests Post-Despliegue
# ──────────────────────────────────────────────────────────
run_smoke_tests() {
    log "\n━━━ Smoke Tests Post-Despliegue ━━━━━━━━━━━━━"
    if [ -f "${REPO_ROOT}/scripts/smoke-test.sh" ]; then
        bash "${REPO_ROOT}/scripts/smoke-test.sh" 2>&1 | tee -a "$LOG_FILE"
        local exit_code=${PIPESTATUS[0]}
        if [ "$exit_code" -eq 0 ]; then
            log "  ✅ Smoke tests: TODOS PASARON"
        else
            log "  ❌ Smoke tests: ALGUNOS FALLARON (código $exit_code)"
            log "     Revisa el log: $LOG_FILE"
        fi
    else
        log "  ⚠️  scripts/smoke-test.sh no encontrado — omitiendo smoke tests"
    fi
}

# ── Ejecución ────────────────────────────────────────────
deploy_api
deploy_backoffice
deploy_landing
run_smoke_tests

log ""
log "============================================"
log "  ✅ Despliegue completado: $ENV"
log "  Log: $LOG_FILE"
log "  Backup: $BACKUP_DIR"
log "============================================"