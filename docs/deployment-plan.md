# Plan de Despliegue — TrackFlow Tech

> **Versión:** 1.0
> **Autor:** DevOps / SRE Lead
> **Fecha:** 2026-10-29
> **Repositorio:** `guillex1180ai-engineering-company-project-monorepo`

---

## Índice

1. [Arquitectura de la Solución](#1-arquitectura-de-la-solución)
2. [Matriz de Ambientes y Variables](#2-matriz-de-ambientes-y-variables)
3. [Pre-requisitos de Infraestructura](#3-pre-requisitos-de-infraestructura)
4. [Flujo de Despliegue Servicio por Servicio](#4-flujo-de-despliegue-servicio-por-servicio)
5. [Script de Despliegue Automatizado](#5-script-de-despliegue-automatizado)
6. [Checklist de Verificación Post-Despliegue](#6-checklist-de-verificación-post-despliegue)
7. [Plan de Rollback](#7-plan-de-rollback)
8. [Anexo: Comandos Rápidos de Validación](#8-anexo-comandos-rápidos-de-validación)

---

## 1. Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                   Usuarios / Clientes                        │
└────────┬──────────────┬──────────────────┬──────────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Landing Page   │ │  Solicitud   │ │  Consola Data    │
│  (index.html)   │ │  Información │ │  (console.html)  │
│                 │ │ (application │ │                  │
│ Puerto: 3000    │ │   .html)     │ │ Puerto: 3000     │
│ Vite + Tailwind │ │              │ │ (misma app Vite) │
└────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
         │                 │                  │
         └─────────────────┼──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backoffice Next.js (SSR/SPA)                    │
│  Puerto: 3001                                                │
│  /login, /register, /forgot-password, /reset-password       │
│  /account/profile, /account/change-password, /incidents     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway — FastAPI (Backend)                 │
│  Puerto: 8000                                                │
│  /auth/*     → login, me, forgot/reset/change-password      │
│  /users      → CRUD usuarios (admin)                        │
│  /profiles   → Perfil del usuario autenticado               │
│  /api/incidents → Analizador de incidencias CSV             │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   TinyDB (JSON DB)   │    │   Resend (Email Service) │
│   src/db_users.json  │    │   Transaccionales        │
│   (file-based)       │    │   (password-reset)       │
└──────────────────────┘    └──────────────────────────┘
```

### Mapa de Puertos y Servicios

| Servicio            | Tecnología        | Puerto | Tipo       | Depende de     |
| ------------------- | ----------------- | ------ | ---------- | -------------- |
| Landing + Solicitud | Vite + Tailwind   | 3000   | Static SPA | —              |
| Consola Data        | Vite + TS         | 3000   | Static SPA | —              |
| Backoffice          | Next.js 16        | 3001   | SSR / SPA  | API (8000)     |
| API Backend         | FastAPI / Uvicorn | 8000   | REST API   | TinyDB, Resend |

---

## 2. Matriz de Ambientes y Variables

### 2.1 Parámetros por Entorno

| Parámetro            | Dev (Local)                 | Staging / QA                               | Producción                                |
| -------------------- | --------------------------- | ------------------------------------------ | ----------------------------------------- |
| **API URL**          | `http://localhost:8000`     | `https://api-staging.trackflow.com`        | `https://api.trackflow.com`               |
| **Frontend URL**     | `http://localhost:3001`     | `https://backoffice-staging.trackflow.com` | `https://backoffice.trackflow.com`        |
| **Landing URL**      | `http://localhost:3000`     | `https://staging.trackflow.com`            | `https://trackflow.com`                   |
| **CORS Origins**     | `http://localhost:3001`     | `https://backoffice-staging.trackflow.com` | `https://backoffice.trackflow.com`        |
| **DB Path (TinyDB)** | `src/db_users.json` (local) | Ruta en volumen persistente                | Ruta en volumen persistente + backups     |
| **JWT Secret**       | Generado local (32+ bytes)  | Secreto gestionado (vault/secret manager)  | Secreto gestionado (vault/secret manager) |
| **Resend API Key**   | Vacía o sandbox             | Key de staging                             | Key de producción                         |
| **Email From**       | `onboarding@resend.dev`     | `noreply@staging.trackflow.com`            | `noreply@trackflow.com`                   |
| **SSL/TLS**          | No aplica (localhost)       | Let's Encrypt / Cert Manager               | Let's Encrypt / Cert Manager + WAF        |

### 2.2 Variables de Entorno — Mapa Completo

```
# ─── JWT ───────────────────────────────────────
SECRET_KEY                  # Mín. 32 bytes hex. Diferente en cada entorno
ALGORITHM                   # HS256 | HS384 | HS512 (default: HS256)
ACCESS_TOKEN_EXPIRE_MINUTES # Minutos de validez del token (default: 30)

# ─── CORS ─────────────────────────────────────
FRONTEND_ORIGINS            # Orígenes permitidos separados por coma
                            # Dev:  http://localhost:3001
                            # Stg:  https://backoffice-staging.trackflow.com
                            # Prod: https://backoffice.trackflow.com

# ─── Password Reset (Resend) ──────────────────
RESEND_API_KEY              # API key de Resend (vacía en dev = logs)
EMAIL_FROM                  # Remitente verificado en Resend
FRONTEND_URL                # URL base del frontend para enlaces de reset
RESET_TOKEN_EXPIRE_MINUTES  # 15–60 minutos (default: 30)

# ─── Backoffice (Next.js) ─────────────────────
NEXT_PUBLIC_API_URL         # URL de la API backend (sin trailing slash)
```

### 2.3 Matriz de Disponibilidad

| Recurso                         | Dev          | Staging                | Producción                 |
| ------------------------------- | ------------ | ---------------------- | -------------------------- |
| Dominio / Subdominio            | localhost    | ✅ Asignado            | ✅ Asignado                |
| Certificado SSL/TLS             | ❌ No aplica | ✅ Let's Encrypt       | ✅ Wildcard + EV           |
| TinyDB (archivo JSON)           | ✅ Local     | ✅ Volumen persistente | ✅ Volumen + backup diario |
| Resend API Key                  | ❌ Vacía     | ✅ Staging key         | ✅ Production key          |
| Conexión a Internet (CDN fonts) | ✅           | ✅                     | ✅                         |

---

## 3. Pre-requisitos de Infraestructura

### 3.1 En Local (Dev)

```bash
# Versiones mínimas requeridas
node --version        # >= 22.x
npm --version         # >= 10.x
python3 --version     # >= 3.12
uv --version          # >= 0.4.x (opcional, para tests)

# Puertos libres (verificar)
for port in 3000 3001 8000; do
  if ss -tlnp "sport = :$port" | grep -q LISTEN; then
    echo "⚠️  Puerto $port ocupado"
  else
    echo "✅ Puerto $port libre"
  fi
done
```

### 3.2 En Staging / Producción (Servidor Linux)

```bash
# Dependencias del sistema
sudo apt-get update
sudo apt-get install -y \
  nginx \
  certbot \
  python3-certbot-nginx \
  nodejs \
  npm

# Node.js 22.x (si no viene en repos)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.12+ y venv
sudo apt-get install -y python3.12 python3.12-venv python3-pip

# Supervisor o systemd para gestionar procesos
sudo apt-get install -y supervisor
```

### 3.3 Verificación de Conexiones Dependientes

```bash
# Verificar que la API Resend responde (si se configuró key)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  https://api.resend.com/emails
# Esperado: 200 (si key válida) o 401 (si key inválida pero reachable)
```

---

## 4. Flujo de Despliegue Servicio por Servicio

### ⚠️ ORDEN ESTRICTO DE DESPLIEGUE

```
 1. Backend API (FastAPI)    ← Dependencia de backoffice
 2. Backoffice (Next.js)     ← Depende de API
 3. Landing + Páginas (Vite) ← Sin dependencias (estático)
```

---

### 4.1 Backend — FastAPI

```bash
# ──────────────────────────────────────────────
# PASO 1A: Configurar entorno Python
# ──────────────────────────────────────────────
cd /ruta/del/repo

python3.12 -m venv .venv
source .venv/bin/activate

# Instalar dependencias de producción
pip install fastapi uvicorn[standard] python-dotenv python-jose[cryptography] \
            passlib[bcrypt] bcrypt email-validator python-multipart tinydb

# O si usas pip sync desde pyproject.toml
pip install .

# ──────────────────────────────────────────────
# PASO 1B: Cargar variables de entorno
# ──────────────────────────────────────────────
# Copiar y personalizar .env
cp .env.example .env
# Editar SECRET_KEY, FRONTEND_ORIGINS, etc.

# ──────────────────────────────────────────────
# PASO 1C: Iniciar servidor
# ──────────────────────────────────────────────
# Con systemd/supervisor (producción):
uvicorn src.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --workers 4 \
  --proxy-headers \
  --forwarded-allow-ips='*'

# Con systemd:
# [Unit]
# Description=TrackFlow API
# After=network.target
#
# [Service]
# Type=simple
# User=www-data
# WorkingDirectory=/ruta/del/repo
# EnvironmentFile=/ruta/del/repo/.env
# ExecStart=/ruta/del/repo/.venv/bin/uvicorn src.main:app --host 127.0.0.1 --port 8000 --workers 4
# Restart=always
# RestartSec=5
#
# [Install]
# WantedBy=multi-user.target

# ──────────────────────────────────────────────
# PASO 1D: Configurar Nginx reverse proxy
# ──────────────────────────────────────────────
# /etc/nginx/sites-available/api.trackflow.com
: '
server {
    listen 80;
    server_name api.trackflow.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.trackflow.com;

    ssl_certificate /etc/letsencrypt/live/api.trackflow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.trackflow.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        # Opcional: restringir con autenticación básica
        # auth_basic "API Docs";
        # auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://127.0.0.1:8000;
    }
}
'
```

### 4.2 Backoffice — Next.js

```bash
# ──────────────────────────────────────────────
# PASO 2A: Variables de entorno del backoffice
# ──────────────────────────────────────────────
cd uis/backoffice

# Crear/editar .env.local (NO versionarlo)
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.trackflow.com
EOF

# ──────────────────────────────────────────────
# PASO 2B: Instalar dependencias
# ──────────────────────────────────────────────
npm ci

# ──────────────────────────────────────────────
# PASO 2C: Build de producción
# ──────────────────────────────────────────────
npm run build
# Output: .next/ (carpeta de build)

# ──────────────────────────────────────────────
# PASO 2D: Iniciar servidor Next.js
# ──────────────────────────────────────────────
# Con systemd/supervisor (producción):
npm run start -- --port 3001

# Con systemd:
# [Unit]
# Description=TrackFlow Backoffice
# After=network.target
#
# [Service]
# Type=simple
# User=www-data
# WorkingDirectory=/ruta/del/repo/uis/backoffice
# Environment=NODE_ENV=production
# ExecStart=/usr/bin/npm run start -- --port 3001
# Restart=always
# RestartSec=5
#
# [Install]
# WantedBy=multi-user.target

# ──────────────────────────────────────────────
# PASO 2E: Configurar Nginx reverse proxy
# ──────────────────────────────────────────────
# /etc/nginx/sites-available/backoffice.trackflow.com
: '
server {
    listen 80;
    server_name backoffice.trackflow.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name backoffice.trackflow.com;

    ssl_certificate /etc/letsencrypt/live/backoffice.trackflow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backoffice.trackflow.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
'
```

### 4.3 Landing + Páginas Públicas — Vite (Static SPA)

```bash
# ──────────────────────────────────────────────
# PASO 3A: Instalar dependencias
# ──────────────────────────────────────────────
cd /ruta/del/repo
npm ci

# ──────────────────────────────────────────────
# PASO 3B: Build de producción
# ──────────────────────────────────────────────
npm run build
# Output: dist/
#   ├── index.html        (landing page)
#   ├── application.html  (formulario solicitud)
#   ├── console.html      (consola data processing)
#   ├── assets/
#   │   ├── index-*.js
#   │   ├── application-*.js
#   │   └── console-*.js
#   └── src/
#       └── index.css

# ──────────────────────────────────────────────
# PASO 3C: Servir con Nginx (producción)
# ──────────────────────────────────────────────
# /etc/nginx/sites-available/trackflow.com
: '
server {
    listen 80;
    server_name trackflow.com www.trackflow.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name trackflow.com www.trackflow.com;

    ssl_certificate /etc/letsencrypt/live/trackflow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trackflow.com/privkey.pem;

    root /ruta/del/repo/dist;
    index index.html;

    # Cacheo de assets estáticos (hasheados por Vite)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: cada .html debe servirse explícitamente
    location = / {
        try_files /index.html =404;
    }

    location = /application {
        return 301 /application.html;
    }

    location = /console {
        return 301 /console.html;
    }

    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
'

# Verificar configuración y recargar
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Script de Despliegue Automatizado

### 5.1 GitHub Actions (existente)

El repositorio ya incluye `.github/workflows/deploy.yml` que despliega el sitio Vite a **GitHub Pages** con cada push a `main`. Este workflow **solo cubre la landing** (sitio estático Vite).

**Tareas pendientes para CI/CD completa:**

1. ✅ Workflow existente: despliegue Vite → GitHub Pages
2. ❌ Workflow para API: build + deploy FastAPI a servidor (SSH + systemctl restart)
3. ❌ Workflow para Backoffice: build + deploy Next.js a servidor (SSH + npm run build + systemctl restart)
4. ❌ Smoke tests automatizados post-deploy

### 5.2 Script de Despliegue Manual (Local/Staging)

```bash
#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# deploy.sh — Despliegue completo de TrackFlow
# Uso: bash deploy.sh [entorno]
#   entorno: dev (default), staging, production
# ──────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-dev}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${REPO_ROOT}/deploy_${ENV}_${TIMESTAMP}.log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando despliegue: $ENV ==="
log "Repositorio: $REPO_ROOT"

# ── Fase 1: Backend API ─────────────────────────────────
deploy_api() {
    log "[1/3] Desplegando Backend API..."

    cd "$REPO_ROOT"

    # Activar virtualenv
    if [ ! -d ".venv" ]; then
        log "  Creando virtualenv..."
        python3.12 -m venv .venv
    fi
    source .venv/bin/activate

    log "  Instalando dependencias Python..."
    pip install -q -e .

    # Validar variables de entorno
    if [ ! -f ".env" ]; then
        log "  ERROR: .env no encontrado. Copia .env.example a .env"
        return 1
    fi

    # Iniciar/recargar servidor
    if command -v systemctl &>/dev/null; then
        log "  Recargando servicio trackflow-api..."
        sudo systemctl restart trackflow-api
    else
        log "  Iniciando servidor de desarrollo..."
        # Matar instancia anterior si existe
        kill $(lsof -t -i:8000) 2>/dev/null || true
        nohup uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload \
            > "${REPO_ROOT}/api_${ENV}.log" 2>&1 &
    fi

    # Health check
    sleep 3
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        log "  ✅ API respondiendo en http://localhost:8000"
    else
        log "  ❌ API no responde"
        return 1
    fi
}

# ── Fase 2: Backoffice Next.js ──────────────────────────
deploy_backoffice() {
    log "[2/3] Desplegando Backoffice..."

    cd "$REPO_ROOT/uis/backoffice"

    log "  Instalando dependencias..."
    npm ci --silent 2>/dev/null || npm install --silent

    log "  Construyendo..."
    npm run build

    if command -v systemctl &>/dev/null; then
        log "  Recargando servicio trackflow-backoffice..."
        sudo systemctl restart trackflow-backoffice
    else
        log "  Iniciando servidor de desarrollo..."
        kill $(lsof -t -i:3001) 2>/dev/null || true
        nohup npm run start -- --port 3001 \
            > "${REPO_ROOT}/backoffice_${ENV}.log" 2>&1 &
    fi

    sleep 5
    if curl -sfL http://localhost:3001/login > /dev/null 2>&1; then
        log "  ✅ Backoffice respondiendo en http://localhost:3001"
    else
        log "  ❌ Backoffice no responde"
        return 1
    fi
}

# ── Fase 3: Landing Páginas (Vite) ─────────────────────
deploy_landing() {
    log "[3/3] Desplegando Landing + Páginas públicas..."

    cd "$REPO_ROOT"

    log "  Construyendo sitio Vite..."
    npm run build

    log "  Verificando build..."
    if [ ! -f "dist/index.html" ]; then
        log "  ❌ Build falló — no se encontró dist/index.html"
        return 1
    fi
    log "  ✅ Build completado: $(ls dist/*.html 2>/dev/null | wc -l) páginas"

    # Si estamos en entorno con Nginx
    if command -v nginx &>/dev/null; then
        log "  Recargando Nginx..."
        sudo nginx -t && sudo systemctl reload nginx
    fi

    # Verificar con preview local
    if command -v npx &>/dev/null; then
        npx vite preview --port 3000 &
        local PREVIEW_PID=$!
        sleep 2
        if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
            log "  ✅ Landing respondiendo en http://localhost:3000"
        fi
        kill $PREVIEW_PID 2>/dev/null || true
    fi
}

# ── Fase 4: Smoke Tests ────────────────────────────────
run_smoke_tests() {
    log "\n=== Ejecutando Smoke Tests ==="

    cd "$REPO_ROOT"

    # Ejecutar el checklist de verificación
    bash scripts/smoke-test.sh && log "✅ Smoke tests PASARON" || {
        log "❌ Smoke tests FALLARON"
        return 1
    }
}

# ── Ejecución principal ─────────────────────────────────
deploy_api
deploy_backoffice
deploy_landing

log "\n=== Despliegue completado: $ENV ==="
log "Log: $LOG_FILE"
```

### 5.3 Script de Smoke Tests

```bash
#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# scripts/smoke-test.sh — Smoke Tests Post-Despliegue
# ──────────────────────────────────────────────────────────
set -euo pipefail

PASS=0
FAIL=0
BASE_API="${API_URL:-http://localhost:8000}"
BASE_BO="${BO_URL:-http://localhost:3001}"
BASE_LANDING="${LANDING_URL:-http://localhost:3000}"

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "=== Smoke Tests: $(date) ==="
echo "API:      $BASE_API"
echo "Backoffice: $BASE_BO"
echo "Landing:  $BASE_LANDING"
echo ""

# ─── 1. Healthchecks HTTP ────────────────────────────────
echo "[1] Healthchecks HTTP"

# API - Swagger docs
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/docs" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "API /docs → 200" || fail "API /docs → $STATUS (esperado 200)"

# API - OpenAPI schema
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/openapi.json" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "API /openapi.json → 200" || fail "API /openapi.json → $STATUS"

# Landing (Vite)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "Landing / → 200" || fail "Landing / → $STATUS"

# Solicitud info
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/application.html" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "Application /application.html → 200" || fail "Application /application.html → $STATUS"

# Consola
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/console.html" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "Console /console.html → 200" || fail "Console /console.html → $STATUS"

# Backoffice (Next.js redirige a /login)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_BO/" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "Backoffice / (con redirect) → 200" || fail "Backoffice / → $STATUS (con redirect)"

# Backoffice /login
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_BO/login" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "Backoffice /login → 200" || fail "Backoffice /login → $STATUS"

echo ""

# ─── 2. Verificación de Assets Estáticos ─────────────────
echo "[2] Assets estáticos y contenido"

# Landing - Meta tags SEO
curl -s "$BASE_LANDING/" | grep -q "TrackFlow" && \
  pass "Landing contiene 'TrackFlow'" || fail "Landing no contiene 'TrackFlow'"

# Landing - Schema.org
curl -s "$BASE_LANDING/" | grep -q "schema.org" && \
  pass "Landing tiene marcado Schema.org" || fail "Landing sin Schema.org"

# Application - Formulario
curl -s "$BASE_LANDING/application.html" | grep -qi "form" && \
  pass "Application.html contiene formulario" || fail "Application.html sin formulario"

# Backoffice - Contenido renderizado
curl -sL "$BASE_BO/login" | grep -qi "trackflow\|login\|iniciar" && \
  pass "Backoffice /login renderiza contenido" || fail "Backoffice /login sin contenido esperado"

echo ""

# ─── 3. Verificación de Endpoints de API ─────────────────
echo "[3] Endpoints clave de API"

# Login endpoint (debe aceptar POST)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@trackflow.com&password=Admin123!" \
  "$BASE_API/auth/login" 2>/dev/null)
[ "$STATUS" = "200" ] && pass "POST /auth/login → 200" || fail "POST /auth/login → $STATUS"

# GET /auth/me sin token debe dar 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/auth/me" 2>/dev/null)
[ "$STATUS" = "401" ] && pass "GET /auth/me (sin token) → 401" || fail "GET /auth/me (sin token) → $STATUS"

# POST /api/incidents/analyze sin archivo debe dar 422
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_API/api/incidents/analyze" 2>/dev/null)
[ "$STATUS" = "422" ] && pass "POST /api/incidents/analyze (sin file) → 422" || fail "POST /api/incidents/analyze (sin file) → $STATUS"

echo ""

# ─── 4. CORS y Seguridad ──────────────────────────────
echo "[4] CORS y cabeceras de seguridad"

# CORS headers en API
CORS_HEADER=$(curl -s -I -X OPTIONS \
  -H "Origin: $BASE_BO" \
  -H "Access-Control-Request-Method: GET" \
  "$BASE_API/auth/login" 2>/dev/null | grep -i "access-control-allow-origin" | tr -d '\r')
[ -n "$CORS_HEADER" ] && pass "CORS: $CORS_HEADER" || fail "CORS: sin cabecera Access-Control-Allow-Origin"

echo ""
echo "=== Resumen: $PASS pasaron, $FAIL fallaron ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

---

## 6. Checklist de Verificación Post-Despliegue

### 6.1 Smoke Testing — Lista de Verificación Manual

| #   | Verificación                       | Comando / Método                                             | Esperado            | Resultado |
| --- | ---------------------------------- | ------------------------------------------------------------ | ------------------- | --------- |
| 1   | API docs accesible                 | `curl -s -o /dev/null -w "%{http_code}" {url}/docs`          | 200                 | ⬜        |
| 2   | API login endpoint funcional       | `curl -s -X POST -d "..." {url}/auth/login`                  | 200 + access_token  | ⬜        |
| 3   | API rechaza peticiones sin token   | `curl -s {url}/auth/me`                                      | 401                 | ⬜        |
| 4   | Landing page carga                 | `curl -s -o /dev/null -w "%{http_code}" {url}`               | 200                 | ⬜        |
| 5   | Meta tags SEO presentes            | `curl -s {url} \| grep -c "description\|og:title"`           | ≥1                  | ⬜        |
| 6   | Schema.org en landing              | `curl -s {url} \| grep -c "schema.org"`                      | ≥1                  | ⬜        |
| 7   | Formulario solicitud carga         | `curl -s -o /dev/null -w "%{http_code}" {url}/application`   | 200                 | ⬜        |
| 8   | Consola datos carga                | `curl -s -o /dev/null -w "%{http_code}" {url}/console`       | 200                 | ⬜        |
| 9   | Backoffice login carga             | `npx playwright open {url}/login` o curl -L                  | 200 + html          | ⬜        |
| 10  | Backoffice registro carga          | `curl -s -o /dev/null -w "%{http_code}" {url}/register`      | 200                 | ⬜        |
| 11  | Login real en backoffice           | Iniciar sesión con admin@trackflow.com / Admin123!           | Redirect a /account | ⬜        |
| 12  | Assets estáticos con caché         | `curl -sI {url}/assets/index-*.js \| grep "Cache-Control"`   | public, immutable   | ⬜        |
| 13  | SSL/TLS válido (no localhost)      | `curl -svI https://{dominio} 2>&1 \| grep "SSL certificate"` | verify ok           | ⬜        |
| 14  | CORS funcionando                   | `curl -sI -X OPTIONS -H "Origin: {frontend}" {api}/auth/*`   | ACAO presente       | ⬜        |
| 15  | Sin errores 500 en endpoints clave | `curl -s -o /dev/null -w "%{http_code}" {url}/health`        | != 500              | ⬜        |

### 6.2 Verificación en Navegador (QA Manual)

```markdown
## 🖥️ Verificación Visual en Navegador

### Landing Page

- [ ] Diseño responsive (320px, 768px, 1280px)
- [ ] Menú de navegación funcional
- [ ] Sección Hero con CTA visible
- [ ] 3 servicios explicados (gestión almacenes, última milla, logística inversa)
- [ ] Cobertura geográfica (EE.UU. + España)
- [ ] Footer con información de contacto
- [ ] No hay errores en consola del navegador (F12 → Console)

### Formulario de Solicitud (/application)

- [ ] 12 campos visibles y etiquetados
- [ ] Validaciones HTML5 funcionan (required, pattern, etc.)
- [ ] Validación JS muestra mensajes de error correctos
- [ ] Advertencia de volumen "0-100 envíos/mes" aparece
- [ ] Envío exitoso muestra confirmación

### Backoffice

- [ ] Ruta /login redirige sin token
- [ ] Login con admin@trackflow.com / Admin123! funciona
- [ ] Vista /account/profile carga datos del usuario
- [ ] Vista /account/change-password funcional
- [ ] Vista /forgot-password y /reset-password cargan
- [ ] Sesión persiste al recargar página
- [ ] Logout funciona y limpia sesión
- [ ] Sin errores de CORS en red (F12 → Network)

### Consola de Datos (/console)

- [ ] Interfaz de demo interactiva cargada
- [ ] Operaciones de processing se ejecutan sin error

### Rendimiento

- [ ] Lighthouse score > 80 en Performance
- [ ] Lighthouse score > 90 en Accessibility
- [ ] Lighthouse score > 90 en SEO
```

---

## 7. Plan de Rollback

### 7.1 Estrategia General

| Escenario                             | Acción de Rollback                                         | Tiempo estimado |
| ------------------------------------- | ---------------------------------------------------------- | --------------- |
| API no responde después del deploy    | Restaurar versión anterior del código + reiniciar servicio | 2-5 min         |
| Backoffice con errores de compilación | Revertir a build anterior + reiniciar Next.js              | 2-3 min         |
| Landing con assets rotos              | Reemplazar `dist/` con backup del build anterior           | 1-2 min         |
| Error de configuración (.env)         | Restaurar `.env` anterior + reiniciar servicios            | 1 min           |
| Falla de migración de datos (TinyDB)  | Restaurar backup de `db_users.json`                        | 1 min           |

### 7.2 Script de Rollback

```bash
#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# rollback.sh — Reversión a versión estable previa
# Uso: bash rollback.sh [servicio]
#   servicio: api, backoffice, landing, all (default)
# ──────────────────────────────────────────────────────────
set -euo pipefail

SERVICE="${1:-all}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${REPO_ROOT}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

rollback_api() {
    log "[Rollback API] Iniciando..."

    # Restaurar respaldo de .env
    if [ -f "${BACKUP_ROOT}/.env.bak" ]; then
        cp "${BACKUP_ROOT}/.env.bak" "${REPO_ROOT}/.env"
        log "  .env restaurado desde backup"
    fi

    # Restaurar respaldo de TinyDB
    if [ -f "${BACKUP_ROOT}/db_users.json.bak" ]; then
        cp "${BACKUP_ROOT}/db_users.json.bak" "${REPO_ROOT}/src/db_users.json"
        log "  Base de datos restaurada desde backup"
    fi

    # Restaurar versión anterior del código (git)
    log "  Revirtiendo código con git..."
    cd "$REPO_ROOT"
    git checkout HEAD~1 -- src/ 2>/dev/null || log "  (No hay commit anterior disponible)"

    # Reiniciar servicio
    if command -v systemctl &>/dev/null; then
        sudo systemctl restart trackflow-api
        log "  Servicio trackflow-api reiniciado"
    fi

    # Health check
    sleep 3
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        log "  ✅ API restaurada y respondiendo"
    else
        log "  ❌ API no responde después del rollback — intervención manual requerida"
    fi
}

rollback_backoffice() {
    log "[Rollback Backoffice] Iniciando..."

    cd "${REPO_ROOT}/uis/backoffice"

    # Restaurar .env.local
    if [ -f "${BACKUP_ROOT}/backoffice/.env.local.bak" ]; then
        cp "${BACKUP_ROOT}/backoffice/.env.local.bak" ".env.local"
        log "  .env.local restaurado"
    fi

    # Restaurar build anterior
    if [ -d "${BACKUP_ROOT}/backoffice/.next" ]; then
        rm -rf .next
        cp -a "${BACKUP_ROOT}/backoffice/.next" .
        log "  Build anterior restaurado"
    fi

    # Reiniciar
    if command -v systemctl &>/dev/null; then
        sudo systemctl restart trackflow-backoffice
    fi

    sleep 5
    if curl -sfL http://localhost:3001/login > /dev/null 2>&1; then
        log "  ✅ Backoffice restaurado"
    else
        log "  ❌ Backoffice no responde — verificar manualmente"
    fi
}

rollback_landing() {
    log "[Rollback Landing] Iniciando..."

    cd "$REPO_ROOT"

    # Restaurar build anterior
    if [ -d "${BACKUP_ROOT}/dist" ]; then
        rm -rf dist
        cp -a "${BACKUP_ROOT}/dist" .
        log "  Build anterior de landing restaurado"
    fi

    # Recargar Nginx si aplica
    if command -v nginx &>/dev/null; then
        sudo nginx -t && sudo systemctl reload nginx
        log "  Nginx recargado"
    fi

    log "  ✅ Landing restaurada"
}

# ── Crear backup del estado actual antes de rollback ────
log "Creando backup del estado actual antes del rollback..."
mkdir -p "${BACKUP_ROOT}/backoffice"
[ -f "${REPO_ROOT}/.env" ] && cp "${REPO_ROOT}/.env" "${BACKUP_ROOT}/.env.pre_rollback"
[ -f "${REPO_ROOT}/uis/backoffice/.env.local" ] && cp "${REPO_ROOT}/uis/backoffice/.env.local" "${BACKUP_ROOT}/backoffice/.env.local.pre_rollback"

# ── Ejecutar según el servicio ──────────────────────────
case "$SERVICE" in
    api)        rollback_api ;;
    backoffice) rollback_backoffice ;;
    landing)    rollback_landing ;;
    all)
        rollback_api
        rollback_backoffice
        rollback_landing
        log "Rollback completo ejecutado."
        ;;
    *)
        echo "Uso: $0 [api|backoffice|landing|all]"
        exit 1
        ;;
esac

log "Rollback de '$SERVICE' completado."
```

### 7.3 Procedimiento de Rollback Rápido (Git)

```bash
# Si el deploy se hizo desde una rama, revertir el commit específico
# 1. Identificar el commit del deploy
git log --oneline -5

# 2. Revertir el último commit (sin perder historia)
git revert HEAD --no-edit

# 3. Hacer force push si es necesario (precaución en main)
git push origin main --force-with-lease

# 4. Re-ejecutar el deploy script con la versión anterior
bash deploy.sh ${ENV}
```

### 7.4 Backup Automático Pre-Deploy

```bash
# Añadir al inicio del deploy.sh:
# ── Backup pre-despliegue ──
BACKUP_DIR="${REPO_ROOT}/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/backoffice"
log "Creando backup en $BACKUP_DIR"

# Backup de configuración
[ -f "${REPO_ROOT}/.env" ] && cp "${REPO_ROOT}/.env" "${BACKUP_DIR}/.env"
[ -f "${REPO_ROOT}/uis/backoffice/.env.local" ] && cp "${REPO_ROOT}/uis/backoffice/.env.local" "${BACKUP_DIR}/backoffice/"
[ -f "${REPO_ROOT}/src/db_users.json" ] && cp "${REPO_ROOT}/src/db_users.json" "${BACKUP_DIR}/"

# Backup de builds
[ -d "${REPO_ROOT}/dist" ] && cp -a "${REPO_ROOT}/dist" "${BACKUP_DIR}/"
[ -d "${REPO_ROOT}/uis/backoffice/.next" ] && cp -a "${REPO_ROOT}/uis/backoffice/.next" "${BACKUP_DIR}/backoffice/"

# Etiqueta de git para referencia rápida al punto de rollback
git tag "deploy-${TIMESTAMP}" HEAD 2>/dev/null || true
log "Tag git creado: deploy-${TIMESTAMP}"
```

---

## 8. Anexo: Comandos Rápidos de Validación

```bash
# ─── Verificar todos los servicios en paralelo ─────────
echo "=== STATUS CHECK TRACKFLOW ==="
for svc in \
  "API|http://localhost:8000/docs" \
  "Landing|http://localhost:3000/" \
  "Application|http://localhost:3000/application.html" \
  "Console|http://localhost:3000/console.html" \
  "Backoffice|http://localhost:3001/login"; do
  NAME="${svc%%|*}"
  URL="${svc##*|}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$URL" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "  ✅ $NAME → $URL ($STATUS)"
  else
    echo "  ❌ $NAME → $URL ($STATUS)"
  fi
done

# ─── Verificar TypeScript ──────────────────────────────
cd /ruta/del/repo && npx tsc --noEmit
echo "Raíz: $? (0 = sin errores)"
cd uis/backoffice && npx tsc --noEmit
echo "Backoffice: $? (0 = sin errores)"

# ─── Verificar tests ───────────────────────────────────
cd /ruta/del/repo
python -m pytest tests/ -q --tb=short
echo "Tests: $? (0 = todos pasaron)"

# ─── CURL login completo ───────────────────────────────
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@trackflow.com&password=Admin123!" \
  http://localhost:8000/auth/login | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
echo "Token: ${TOKEN:0:20}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me | python3 -m json.tool

# ─── Monitorear logs en tiempo real ────────────────────
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
# O para systemd:
journalctl -u trackflow-api -f --no-hostname -o cat
```

---

## Resumen de Ciclo de Vida del Despliegue

```
┌─────────────────────────────────────────────────────────┐
│                   PRE-DESPLIEGUE                         │
│  1. Backup de .env, .env.local, db_users.json, builds   │
│  2. Git tag al HEAD actual                               │
│  3. Verificar TypeScript (tsc --noEmit en ambos)         │
│  4. Ejecutar tests (pytest + npm test)                   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    DESPLIEGUE                            │
│  Paso 1: Backend API (FastAPI + Uvicorn)                 │
│  Paso 2: Backoffice (Next.js build + start)              │
│  Paso 3: Landing (Vite build + Nginx static serve)       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 POST-DESPLIEGUE                          │
│  1. Smoke tests automáticos (healthchecks HTTP)          │
│  2. Verificación de assets y contenido                   │
│  3. Verificación de endpoints clave                      │
│  4. Verificación visual en navegador (QA)                │
│  5. Lighthouse audit (Performance, Accessibility, SEO)   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ¿Smoke tests OK?                                       │
│  ├── Sí → ✅ Despliegue completado                       │
│  └── No → 🚨 Ejecutar rollback.sh [servicio]            │
└─────────────────────────────────────────────────────────┘
```
