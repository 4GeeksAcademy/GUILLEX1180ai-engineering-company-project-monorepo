#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# scripts/rollback.sh — Reversión a versión estable previa
# Uso: bash rollback.sh [servicio] [timestamp]
#   servicio: api, backoffice, landing, all (default)
#   timestamp: opcional, restaura un backup específico
#              (formato: YYYYMMDD_HHMMSS o "latest")
#
# Ejemplos:
#   bash rollback.sh all              # Revierte todo al último backup
#   bash rollback.sh api              # Solo API
#   bash rollback.sh backoffice       # Solo backoffice
#   bash rollback.sh landing          # Solo landing
#   bash rollback.sh all 20261029_153000  # Backup específico
# ──────────────────────────────────────────────────────────
set -euo pipefail

SERVICE="${1:-all}"
SPECIFIC_TIMESTAMP="${2:-latest}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${REPO_ROOT}/backups"

log() { echo "[$(date '+%H:%M:%S')] $*"; }
bail() { log "❌ ERROR: $*"; exit 1; }
warn() { echo "  ⚠️  $*"; }

# ── Encontrar backup ─────────────────────────────────────
find_backup() {
    if [ "$SPECIFIC_TIMESTAMP" = "latest" ]; then
        ls -1dt "${BACKUP_ROOT}"/2* 2>/dev/null | head -1 || echo ""
    else
        echo "${BACKUP_ROOT}/${SPECIFIC_TIMESTAMP}"
    fi
}

SELECTED_BACKUP=$(find_backup)
if [ -z "$SELECTED_BACKUP" ] || [ ! -d "$SELECTED_BACKUP" ]; then
    bail "No se encontró backup en $BACKUP_ROOT/${SPECIFIC_TIMESTAMP}"
fi

log "═══════════════════════════════════════════════"
log "  Rollback TrackFlow — Servicio: $SERVICE"
log "  Backup: $SELECTED_BACKUP"
log "═══════════════════════════════════════════════"

# ── Rollback API ──────────────────────────────────────
rollback_api() {
    log "[Rollback API] Iniciando..."
    cd "$REPO_ROOT"

    if [ -f "${SELECTED_BACKUP}/.env" ]; then
        cp "${SELECTED_BACKUP}/.env" "${REPO_ROOT}/.env"
        log "  ✅ .env restaurado"
    else
        warn ".env no encontrado en backup — saltando"
    fi

    if [ -f "${SELECTED_BACKUP}/db_users.json" ]; then
        cp "${SELECTED_BACKUP}/db_users.json" "${REPO_ROOT}/src/db_users.json"
        log "  ✅ Base de datos (db_users.json) restaurada"
    fi

    # Revertir cambios de código si hay tag de git
    TAG="deploy_pre_$(basename "$SELECTED_BACKUP")"
    if git tag | grep -q "$TAG"; then
        log "  Revirtiendo código a tag git: $TAG"
        git checkout "$TAG" -- src/ 2>/dev/null || warn "No se pudo revertir src/ con git"
    fi

    # Reiniciar servicio
    if command -v systemctl &>/dev/null; then
        sudo systemctl restart trackflow-api || warn "systemctl restart falló"
    else
        kill "$(lsof -t -i:8000)" 2>/dev/null || true
        nohup uvicorn src.main:app --host 0.0.0.0 --port 8000 \
            > "${REPO_ROOT}/logs/api_rollback.log" 2>&1 &
    fi

    sleep 4
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        log "  ✅ API restaurada y respondiendo"
    else
        warn "API no responde — requiere intervención manual"
    fi
}

# ── Rollback Backoffice ───────────────────────────────
rollback_backoffice() {
    log "[Rollback Backoffice] Iniciando..."
    cd "${REPO_ROOT}/uis/backoffice"

    if [ -f "${SELECTED_BACKUP}/backoffice/.env.local" ]; then
        cp "${SELECTED_BACKUP}/backoffice/.env.local" ".env.local"
        log "  ✅ .env.local restaurado"
    fi

    if [ -d "${SELECTED_BACKUP}/backoffice/.next" ]; then
        rm -rf .next
        cp -a "${SELECTED_BACKUP}/backoffice/.next" .
        log "  ✅ Build anterior (.next) restaurado"
    fi

    if command -v systemctl &>/dev/null; then
        sudo systemctl restart trackflow-backoffice || warn "systemctl restart falló"
    else
        kill "$(lsof -t -i:3001)" 2>/dev/null || true
        nohup npm run start -- --port 3001 \
            > "${REPO_ROOT}/logs/backoffice_rollback.log" 2>&1 &
    fi

    sleep 8
    if curl -sfL http://localhost:3001/login > /dev/null 2>&1; then
        log "  ✅ Backoffice restaurado y respondiendo"
    else
        warn "Backoffice no responde — requiere intervención manual"
    fi
}

# ── Rollback Landing ─────────────────────────────────
rollback_landing() {
    log "[Rollback Landing] Iniciando..."
    cd "$REPO_ROOT"

    if [ -d "${SELECTED_BACKUP}/dist" ]; then
        rm -rf dist
        cp -a "${SELECTED_BACKUP}/dist" .
        log "  ✅ Build anterior (dist/) restaurado"
    else
        warn "dist/ no encontrado en backup"
    fi

    if command -v nginx &>/dev/null; then
        sudo nginx -t && sudo systemctl reload nginx || warn "Nginx recarga falló"
        log "  ✅ Nginx recargado"
    fi

    log "  ✅ Landing restaurada"
}

# ── Ejecución ─────────────────────────────────────────
case "$SERVICE" in
    api)
        rollback_api
        ;;
    backoffice)
        rollback_backoffice
        ;;
    landing)
        rollback_landing
        ;;
    all)
        rollback_api
        rollback_backoffice
        rollback_landing
        log "✅ Rollback completo ejecutado desde: $SELECTED_BACKUP"
        ;;
    *)
        echo "Uso: $0 [api|backoffice|landing|all] [timestamp]"
        echo ""
        echo "Backups disponibles:"
        ls -1dt "${BACKUP_ROOT}"/2* 2>/dev/null | head -5 || echo "  (ninguno)"
        exit 1
        ;;
esac

echo ""
log "═══════════════════════════════════════════════"
log "  Rollback de '$SERVICE' completado."
log "═══════════════════════════════════════════════"