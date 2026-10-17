# Tech Context — TrackFlow

> Contexto técnico y arquitectura del monorepo. Describe **cómo** se construye el proyecto.
> Fuente de verdad de negocio: [`CONTEXT.es.md`](../CONTEXT.es.md).

## Stack Técnico de Aplicación

- **Sitio web B2B:** HTML5 semántico + Tailwind CSS + JavaScript (Vanilla según la plantilla del monorepo).
- **Markup estructurado:** Schema.org tipo `Organization` (JSON-LD) en la landing page.
- **Validación del formulario:** JS nativo (HTML5 attributes + validación custom en `validation.js`) con mensajes de error idénticos a `CONTEXT.es.md`.
- **Optimización:** responsive, accesible (ARIA, contraste, foco visible) y SEO (meta tags + Open Graph + Schema.org).

## Estructura del Monorepo

El monorepo sigue la plantilla oficial de 4Geeks Academy para el proyecto cross-functional de AI Engineering. Estructura relevante:

| Ruta               | Propósito                                             | Estado                                                                                                                          |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `./uis/website`    | Sitio público B2B de TrackFlow (landing + formulario) | **No creado aún** — el frontend actual vive en la raíz (`index.html`, `application.html`, `console.html`) hasta migrar a `uis/` |
| `./uis/backoffice` | App interna / Backoffice (admin, operaciones)         | Pensado para hitos futuros                                                                                                      |
| `/services`        | APIs y Microservicios del backend                     | Pensado para hitos futuros                                                                                                      |
| `./memory-bank/`   | Banco de memoria (este directorio)                    | Activo                                                                                                                          |
| `./.agents/`       | Reglas y skills de agentes del monorepo               | Activo                                                                                                                          |
| `./AGENTS.md`      | Protocolo obligatorio de agentes                      | Activo                                                                                                                          |

## Mapeo de Capa de Aplicación

Capa oficial de aplicación del monorepo. **Toda** interfaz/servicio de TrackFlow vive exclusivamente aquí:

| Capa                              | Ruta oficial       | Contenido                                                                                                                 |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Frontend público (B2B)**        | `./uis/website`    | Landing page pública con ruta raíz `/`, copy y branding alineados con `CONTEXT.md`; formulario de cualificación de leads. |
| **Frontend interno (Backoffice)** | `./uis/backoffice` | App interna con layout propio, separada del sitio público; entrada en `/`.                                                |
| **Backend / APIs**                | `/services`        | APIs y microservicios consumidos por el frontend.                                                                         |

> **Antes de escribir código de aplicación en hitos posteriores, leer el README de cada ruta**
> (`./uis/README.md`, `./uis/website/README.md` si existe, `/services/README.md`) para respetar la documentación oficial de la plantilla.

### Nota de migración (Hito 1)

El proyecto actual mantiene el sitio público en la **raíz** (páginas `index.html` / `application.html` / `console.html` con Vite multi-page). La estructura oficial de monorepo delinea `./uis/website` para el frontend público y `./uis/backoffice` para la app interna; las APIs irán en `/services`.

## Restricciones Arquitectónicas

- **Respetar los README.md existentes** de la plantilla del monorepo (en `./uis/`, `/services`, `./agents/`, `./skills/`, etc.).
- **⚠️ Prohibido crear un segundo árbol de directorios o carpetas paralelas** para frontend, apps o servicios backend. **NO** crear `/apps`, `/frontend`, `/backend`, `/src/website`, etc. Toda interfaz vive en `./uis/**` y todo backend en `/services`.
- El frontend público va en `./uis/website`, el backoffice en `./uis/backoffice` y las APIs en `/services`.
- **Cualquier desviación de esta estructura requiere confirmación explícita** antes de crear archivos fuera de la estructura oficial.
- No mutar `package.json` / `tsconfig.json` / configs raíz sin confirmación del Tech Lead.

## Convenciones Técnicas del Hito 1

- **Tailwind CSS** como única fuente de estilos en el sitio público (`./uis/website/**`).
- **Mensajes de validación** tipo copia textual de `CONTEXT.es.md` (12 campos + advertencia volumen `0-100`).
- **Comentarios explicativos obligatorios** en código clave (lógica de validación, advertencia de eficiencia, Schema.org).
- **Accesibilidad:** labels asociados (`for`/`id`), `aria-describedby` para errores, contraste AA, foco visible.

## Herramientas y Comandos

| Comando               | Uso                                                   |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo Vite (`http://localhost:3000`) |
| `npm run build`       | Build de producción en `dist/`                        |
| `npm run preview`     | Preview del build de producción                       |
| `npx tsc --noEmit`    | Typecheck estricto de la capa de datos TS             |
| `npx tsx src/demo.ts` | Demo ejecutable de la capa de procesamiento de datos  |
