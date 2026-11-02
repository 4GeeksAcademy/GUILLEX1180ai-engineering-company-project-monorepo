#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# scripts/smoke-test.sh — Smoke Tests Post-Despliegue
#
# Uso:
#   bash scripts/smoke-test.sh
#   API_URL=http://localhost:8000 BO_URL=http://localhost:3001 \
#     LANDING_URL=http://localhost:3000 bash scripts/smoke-test.sh
#
# Exit code: 0 = todos pasaron, 1 = al menos uno falló
# ──────────────────────────────────────────────────────────
set -euo pipefail

BASE_API="${API_URL:-http://localhost:8000}"
BASE_BO="${BO_URL:-http://localhost:3001}"
BASE_LANDING="${LANDING_URL:-http://localhost:3000}"

PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "═══════════════════════════════════════════════"
echo "  TrackFlow Smoke Tests — $(date)"
echo "═══════════════════════════════════════════════"
echo "  API:       $BASE_API"
echo "  Backoffice: $BASE_BO"
echo "  Landing:   $BASE_LANDING"
echo ""

# ─── 1. Healthchecks HTTP ────────────────────────────────
echo "[1] Healthchecks HTTP"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/docs" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "API /docs → 200" || fail "API /docs → $STATUS (esperado 200)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/openapi.json" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "API /openapi.json → 200" || fail "API /openapi.json → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Landing / → 200" || fail "Landing / → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/application.html" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Application /application.html → 200" || fail "Application /application.html → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_LANDING/console.html" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Console /console.html → 200" || fail "Console /console.html → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_BO/" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Backoffice / (follow redirect) → 200" || fail "Backoffice / → $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_BO/login" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Backoffice /login → 200" || fail "Backoffice /login → $STATUS"

echo ""

# ─── 2. Contenido y Assets ───────────────────────────────
echo "[2] Verificación de contenido"

curl -s "$BASE_LANDING/" 2>/dev/null | grep -qi "trackflow" && \
  pass "Landing contiene 'TrackFlow'" || fail "Landing NO contiene 'TrackFlow'"

curl -s "$BASE_LANDING/" 2>/dev/null | grep -q "schema.org" && \
  pass "Landing tiene marcado Schema.org" || fail "Landing sin Schema.org"

curl -s "$BASE_LANDING/application.html" 2>/dev/null | grep -qi "form\|input" && \
  pass "Application.html contiene formulario" || fail "Application.html sin formulario"

curl -sL "$BASE_BO/login" 2>/dev/null | grep -qi "trackflow\|login\|iniciar" && \
  pass "Backoffice /login renderiza contenido TrackFlow" || fail "Backoffice /login sin contenido esperado"

echo ""

# ─── 3. Endpoints de API ─────────────────────────────────
echo "[3] Endpoints clave de API"

# GET /auth/me sin token debe dar 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/auth/me" 2>/dev/null || echo "000")
[ "$STATUS" = "401" ] && pass "GET /auth/me (sin token) → 401" || fail "GET /auth/me → $STATUS (esperado 401)"

# Login endpoint
LOGIN_RESP=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@trackflow.com&password=Admin123!" \
  "$BASE_API/auth/login" 2>/dev/null || echo "")
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
[ -n "$TOKEN" ] && pass "POST /auth/login → token recibido" || fail "POST /auth/login → no se obtuvo token"

# /auth/me con token
if [ -n "$TOKEN" ]; then
  ME_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_API/auth/me" 2>/dev/null || echo "")
  echo "$ME_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('email')" 2>/dev/null && \
    pass "GET /auth/me (con token) → datos de usuario" || fail "GET /auth/me (con token) → respuesta inesperada"
fi

# /api/incidents/analyze sin archivo → 422
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_API/api/incidents/analyze" 2>/dev/null || echo "000")
[ "$STATUS" = "422" ] && pass "POST /api/incidents/analyze (sin file) → 422" || fail "POST /api/incidents/analyze (sin file) → $STATUS (esperado 422)"

echo ""

# ─── 4. CORS ─────────────────────────────────────────────
echo "[4] Cabeceras CORS"

CORS_HEADER=$(curl -s -I -X OPTIONS \
  -H "Origin: $BASE_BO" \
  -H "Access-Control-Request-Method: GET" \
  "$BASE_API/auth/login" 2>/dev/null | grep -i "access-control-allow-origin" | tr -d '\r' | head -1)
[ -n "$CORS_HEADER" ] && pass "CORS: $CORS_HEADER" || fail "CORS: sin cabecera Access-Control-Allow-Origin"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Resumen: $PASS pasaron  |  $FAIL fallaron"
echo "═══════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1