# TrackFlow Backoffice

Aplicación privada de AUTH-02, independiente del sitio público Vite.

## Desarrollo local

```bash
cd uis/backoffice
npm install
cp .env.local.example .env.local
npm run dev
```

La aplicación utiliza `http://localhost:3001`. FastAPI se ejecuta en `http://localhost:8000`; configura `FRONTEND_ORIGINS` en el entorno del backend si necesitas permitir otro origen.

## Rutas

- `/login`: autenticación con FastAPI.
- `/register`: registro y login automático.
- `/account/profile`: gestión autenticada del perfil.

El route group privado solo protege estas páginas del backoffice. El website público del Hito 1 continúa en Vite y no usa este guard.

## Validación

```bash
npm run typecheck
npm run build
```