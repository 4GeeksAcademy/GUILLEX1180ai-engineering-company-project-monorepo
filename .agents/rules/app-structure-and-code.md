---
applyTo: "**"
---

# Regla: App Structure & Code — TrackFlow (Monorepo)

> Regla de desarrollo del monorepo que define **dónde vive el código de aplicación**
> y **cómo se escribe** en TrackFlow. Es la regla de referencia para toda capa de aplicación.

## Alcance de aplicación

- **Estado:** siempre activa para todas las modificaciones del monorepo (`applyTo: '**'`).
- **Aplicable especialmente a:** `./uis/**`, `./services/**`, las páginas existentes en la raíz y `src/`.
- **Fuente de verdad:** `BRIEFING.md`; el mapa técnico se mantiene en `memory-bank/techContext.md`.

## Normas obligatorias

### 1. Separación estricta de capas de aplicación

Respetar **estrictamente** la separación de la estructura oficial del monorepo:

| Capa                    | Ruta oficial       | Contenido                                                                                     |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| **Contenedor frontend** | `./uis`            | Contenedor principal de los proyectos frontend de la empresa.                                 |
| **Sitio público**       | `./uis/website`    | Sitio corporativo público en `/`, alineado en diseño, marca, tono y textos con `BRIEFING.md`. |
| **App interna**         | `./uis/backoffice` | Administración operativa interna en `/`, con layout propio aislado del sitio público.         |
| **Backend / APIs**      | `./services`       | Contenedor principal de todas las APIs, microservicios y servicios backend.                   |

> **ESTÁ ESTRICTAMENTE PROHIBIDO** crear carpetas paralelas (`/frontend`, `/backend`, `/apps`, `/api`) o inventar un árbol alternativo. Todo el código de aplicación nuevo vive únicamente en `./uis/website`, `./uis/backoffice` y `./services`, de acuerdo con su responsabilidad. El sitio existente sigue en la raíz hasta migrarlo; no duplicarlo.
> Si una ruta oficial existe o contiene código inicial, conservarlo y respetar su README; no crear otra estructura para reemplazarlo.

### 2. Estilos — Tailwind CSS exclusivo

- Uso **exclusivo de Tailwind CSS** para estilos en interfaces web (clases utilitarias); **no** CSS custom en línea ni hojas de estilos paralelas (salvo `tailwind.config.js` para la paleta institucional).
- Paleta corporativa TrackFlow (por defecto): forest `#102d27`, leaf `#22c55e`, paper `#f8fafc`, ink `#0f172a`, coral `#f97316`, muted `#64748b`.

### 3. Accesibilidad en formularios

- Cada input/select/textarea debe estar asociado a su `<label>` (atributo `for` + `id`).
- Errores de validación vinculados con `aria-describedby` y `role="alert"` para lectores de pantalla.
- Contraste AA, foco visible (`focus-visible`), `lang` correcto y navegación por teclado funcional.

### 4. Mensajes de validación

- Los mensajes de error mostrados al usuario **deben ser idénticos** a los especificados en `BRIEFING.md` (tabla de campos + mensajes de error). No se admite parafrasear.

### 5. Comentarios explicativos en código clave

- **Obligatorio** comentar el código clave: lógica de validación, advertencia de eficiencia (volumen `0-100`), marcado Schema.org y manipulación sensible del DOM.
- Comentarios breves y útiles (qué y por qué), en español o inglés consistente con el archivo.

## Reglas adicionales (recomendadas)

- Semántica HTML5 correcta (header, nav, main, section, footer) en la landing.
- Marcado **Schema.org `Organization`** (JSON-LD) presente en la landing.
- Sin `console.log` en producción (solo en demos/console).
- Antes de escribir código de aplicación, leer y respetar `./uis/README.md`, los README de `./uis/website` y `./uis/backoffice` si existen, `./services/README.md` y el README de cada servicio.

## Verificación de la regla

Antes de commitear (Paso 3 de `AGENTS.md`):

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run build` sin errores.
- [ ] Inspección visual/manual de validaciones y accesibilidad en la ruta actual del sitio (raíz hasta completar migración; después `./uis/website`).
- [ ] Confirmar (Paso 2 de `AGENTS.md`) que no se crearon árboles paralelos y que el código nuevo está únicamente en `./uis/website`, `./uis/backoffice` o `./services`.
