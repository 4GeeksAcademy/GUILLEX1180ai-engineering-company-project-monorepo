# Regla: App Structure & Code — TrackFlow (Monorepo)

> Regla de desarrollo del monorepo que define **dónde vive el código de aplicación**
> y **cómo se escribe** en TrackFlow. Es la regla de referencia para toda capa de aplicación.

## Alcance de aplicación

- **Estado:** ⚠️ **Siempre activa para todo el proyecto** (aplica a todas las modificaciones de agentes).
- **Aplicable a:** `./uis/**` y `/services/**`.
- **Fuente de verdad:** mapa de capa de aplicación en `memory-bank/techContext.md` y briefing en `CONTEXT.es.md`.

## Normas obligatorias

### 1. Separación estricta de capas de aplicación

Respetar **estrictamente** la separación de la estructura oficial del monorepo:

| Capa               | Ruta oficial       | Contenido                                            |
| ------------------ | ------------------ | ---------------------------------------------------- |
| **Sitio público**  | `./uis/website`    | Landing B2B pública + formulario de leads.           |
| **App interna**    | `./uis/backoffice` | Backoffice con layout propio (separado del público). |
| **Backend / APIs** | `/services`        | APIs y microservicios.                               |

> ⚠️ **Prohibido** crear un segundo árbol de directorios o carpetas paralelas para frontend, apps
> o backend (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.). Toda interfaz vive en `./uis/**`
> y todo backend en `/services`. Cualquier desviación requiere confirmación explícita del Tech Lead.

### 2. Estilos — Tailwind CSS exclusivo

- Uso **exclusivo de Tailwind CSS** para estilos en interfaces web (clases utilitarias); **no** CSS custom en línea ni hojas de estilos paralelas (salvo `tailwind.config.js` para la paleta institucional).
- Paleta corporativa TrackFlow (por defecto): forest `#102d27`, leaf `#22c55e`, paper `#f8fafc`, ink `#0f172a`, coral `#f97316`, muted `#64748b`.

### 3. Accesibilidad en formularios

- Cada input/select/textarea debe estar asociado a su `<label>` (atributo `for` + `id`).
- Errores de validación vinculados con `aria-describedby` y `role="alert"` para lectores de pantalla.
- Contraste AA, foco visible (`focus-visible`), `lang` correcto y navegación por teclado funcional.

### 4. Mensajes de validación

- Los mensajes de error mostrados al usuario **deben ser idénticos** a los especificados en `CONTEXT.es.md` (tabla de campos + mensajes de error). No se admite parafrasear.

### 5. Comentarios explicativos en código clave

- **Obligatorio** comentar el código clave: lógica de validación, advertencia de eficiencia (volumen `0-100`), marcado Schema.org y manipulación sensible del DOM.
- Comentarios breves y útiles (qué y por qué), en español o inglés consistente con el archivo.

## Reglas adicionales (recomendadas)

- Semántica HTML5 correcta (header, nav, main, section, footer) en la landing.
- Marcado **Schema.org `Organization`** (JSON-LD) presente en la landing.
- Sin `console.log` en producción (solo en demos/console).
- Respetar los README oficiales de cada ruta (`./uis/README.md`, `/services/README.md`) antes de escribir código de aplicación.

## Verificación de la regla

Antes de commitear (Paso 3 de `AGENTS.md`):

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run build` sin errores.
- [ ] Inspección visual/manual de validaciones y accesibilidad en `./uis/**`.
- [ ] Confirmar (Paso 2 de `AGENTS.md`) que no existen carpetas paralelas fuera de `./uis/**` y `/services`.
