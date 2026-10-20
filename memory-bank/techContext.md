# Tech Context — TrackFlow

> Contexto técnico y arquitectura del monorepo. Describe **cómo** se construye el proyecto.
> Fuente de verdad de negocio: [`BRIEFING.md`](../BRIEFING.md).

## Stack Técnico de Aplicación

- **Sitio web B2B actual:** Vite multipágina con HTML5, Tailwind CSS y JavaScript vanilla; landing/formulario en la raíz (`index.html`, `application.html`, `validation.js`). La ubicación destino es `./uis/website`; la migración está pendiente.
- **Capa de dominio/demos:** TypeScript en `src/types/` y `src/utils/`; `console.html` y `src/interactive-demo.ts` exponen una demo interactiva parcial del Hito 2.
- **Markup estructurado:** Schema.org tipo `Organization` (JSON-LD) en la landing page.
- **Validación del formulario:** atributos HTML5 + validación custom en `validation.js`; los mensajes deben coincidir exactamente con `BRIEFING.md`.
- **Optimización:** responsive, accesible (ARIA, contraste, foco visible) y SEO (meta tags + Open Graph + Schema.org).
- **Herramientas existentes:** Vite, TypeScript, Tailwind CSS y `tsx`; comandos principales: `npm run dev`, `npm run build`, `npm run ts:check` y `npm run ts:demo`.

## Estructura del Monorepo

El monorepo sigue la plantilla oficial de 4Geeks Academy para el proyecto cross-functional de AI Engineering. Estructura relevante:

| Ruta               | Propósito                                             | Estado                                                                                                                          |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `./uis/website`    | Sitio público B2B de TrackFlow (landing + formulario) | **No creado aún** — el frontend actual vive en la raíz (`index.html`, `application.html`, `console.html`) hasta migrar a `uis/` |
| `./uis/backoffice` | App interna / Backoffice (admin, operaciones)         | Pensado para hitos futuros                                                                                                      |
| `./services`       | APIs, microservicios y servicios backend              | El contenedor existe; no hay servicios de TrackFlow implementados todavía.                                                      |
| `./memory-bank/`   | Banco de memoria (este directorio)                    | Activo                                                                                                                          |
| `./.agents/`       | Reglas y skills de agentes del monorepo               | Activo                                                                                                                          |
| `./AGENTS.md`      | Protocolo obligatorio de agentes                      | Activo                                                                                                                          |

## Mapeo de Capa de Aplicación

Capa oficial de aplicación del monorepo. **Toda** interfaz/servicio de TrackFlow vive exclusivamente aquí:

| Ruta oficial | Responsabilidad |
| --- | --- |
| `./uis` | Contenedor principal de todos los proyectos frontend de la empresa, de acuerdo con `uis/README.md`. |
| `./uis/website` | Sitio web corporativo público, servido en la ruta `/`. Todo el diseño, marca, tono y textos deben estar 100% alineados con `BRIEFING.md`. |
| `./uis/backoffice` | Aplicación interna de administración, servida en la ruta `/` de su propia app, con layout aislado del sitio público y destinada a la gestión operativa del negocio. |
| `./services` | Contenedor principal de todas las APIs, microservicios y servicios backend; cada servicio debe tener su propia subcarpeta y documentación técnica y funcional según `services/README.md`. |

**ESTÁ ESTRICTAMENTE PROHIBIDO** crear carpetas paralelas (`/frontend`, `/backend`, `/apps`, `/api`) o inventar un árbol alternativo. Todo código de aplicación nuevo debe vivir únicamente en las rutas oficiales anteriores. Si ya existe código inicial en una ruta oficial, mantenerlo coherente con su README y no duplicarlo en otro árbol.

| Capa                              | Ruta oficial       | Contenido                                                                                                                  |
| --------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Frontend público (B2B)**        | `./uis/website`    | Landing page pública con ruta raíz `/`, copy y branding alineados con `BRIEFING.md`; formulario de cualificación de leads. |
| **Frontend interno (Backoffice)** | `./uis/backoffice` | App interna con layout propio, separada del sitio público; entrada en `/`.                                                 |
| **Backend / APIs**                | `./services`       | APIs, microservicios y servicios backend consumidos por las interfaces.                                                    |

> **Antes de escribir código de aplicación, leer el `README.md` de cada carpeta involucrada**: `./uis/README.md`, `./uis/website/README.md` y `./uis/backoffice/README.md` si existen, además de `./services/README.md` y el README de cada servicio. Respetar las directrices de sus contenedores y proyectos.

### Nota de migración (Hito 1)

El sitio público actual se ejecuta desde la **raíz** (`index.html`, `application.html`, `console.html` con Vite multipágina), como estado transitorio pendiente de migración a `./uis/website`. No crear copias ni nuevas carpetas paralelas. `./uis/website`, `./uis/backoffice` y los servicios de TrackFlow aún no están implementados en sus rutas oficiales.

## Restricciones Arquitectónicas

- **Respetar los README.md existentes** de la plantilla del monorepo (en `./uis/`, `./services/`, `./agents/`, `./skills/`, etc.).
- **ESTÁ ESTRICTAMENTE PROHIBIDO crear carpetas paralelas** (`/frontend`, `/backend`, `/apps`, `/api`, `/src/website`) o inventar un árbol alternativo. Todo el código de aplicación nuevo vive únicamente en `./uis/website`, `./uis/backoffice` o `./services`, según su responsabilidad.
- Si esas rutas ya existen o contienen código inicial, conservarlo y seguir el README correspondiente. La aplicación existente en la raíz es transitoria: no crear otra copia allí ni en una estructura alternativa.
- **Cualquier desviación de esta estructura requiere confirmación explícita** antes de crear archivos fuera de la estructura oficial.
- No mutar `package.json` / `tsconfig.json` / configs raíz sin confirmación del Tech Lead.

## Convenciones Técnicas del Hito 1

- **Tailwind CSS** como única fuente de estilos en el sitio público (`./uis/website/**`).
- **Mensajes de validación** tipo copia textual de `BRIEFING.md` (12 campos + advertencia volumen `0-100`).
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
