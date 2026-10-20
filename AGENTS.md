# AGENTS.md — Protocolo de Agentes del Monorepo TrackFlow

> Este archivo define el **proceso obligatorio** que todo agente (IA o humano)
> debe seguir al trabajar en el monorepo de **TrackFlow Tech**.
> Fuente de verdad de negocio: [`BRIEFING.md`](./BRIEFING.md).

---

## 1. Archivos a leer al iniciar cada sesión

Antes de escribir o modificar cualquier código, todo agente DEBE leer:

1. **`./BRIEFING.md`** — briefing canónico de negocio, entidades, campos del formulario, validaciones y mensajes de error.
2. **Todo el contenido de `./memory-bank/`** — contexto técnico y estado del proyecto:
   - `memory-bank/projectbrief.md`
   - `memory-bank/techContext.md`
   - `memory-bank/progress.md`

> `BRIEFING.md` prevalece sobre resúmenes derivados. No sustituirlo por `CONTEXT.es.md` sin autorización humana.

---

## 2. Flujo obligatorio antes de cada commit

Todo cambio que vaya a commitearse **debe** pasar por los siguientes 5 pasos, en orden:

### Paso 1 — Requisitos y alcance

Contrastar el cambio con las especificaciones de:

- `BRIEFING.md` (empresa, audiencia B2B, servicios, campos, validaciones y mensajes exactos).
- `memory-bank/projectbrief.md`, `techContext.md` y `progress.md`.

### Paso 2 — Validación de rutas y límites

Confirmar que **no se crearon archivos ni carpetas paralelas fuera de la estructura oficial**:

- Sitio público B2B → `./uis/website`
- App interna / Backoffice → `./uis/backoffice`
- APIs y Microservicios → `./services`

> Está **prohibido** crear árboles paralelos (`/apps`, `/frontend`, `/backend`, `/src/website`, etc.).
> La aplicación actual aún vive parcialmente en la raíz. No crear nuevas rutas paralelas ni migrar archivos existentes sin revisar los README aplicables; registrar cualquier desviación autorizada en `memory-bank/progress.md`.

### Paso 3 — Verificación de código y calidad

Ejecutar las comprobaciones configuradas que correspondan al cambio:

- `npm run ts:check` (typecheck de TypeScript).
- `npm run build` (compilación Vite).
- `npm run ts:demo` si se cambian modelos o utilidades.
- Linter, formateador o pruebas relevantes solo si están configurados; no afirmar que corrieron si no existen.

### Paso 4 — Actualización de memoria

Actualizar `memory-bank/progress.md` reflejando:

- Los cambios realizados.
- El estado actual del proyecto.
- Próximos pasos.

### Paso 5 — Commit estandarizado

Solo después de los pasos anteriores y si el desarrollador solicita commitear, usar un mensaje conciso con el formato `tipo(alcance): descripción` (por ejemplo, `docs(agents): alinear protocolo con briefing`). No crear commits sin autorización explícita.

---

## 3. Carpetas y archivos protegidos

Los siguientes archivos/carpetas están **protegidos**: requieren **confirmación explícita**
antes de editarlos:

| Protegido                                                                                                                | Razón                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `BRIEFING.md` y datos operativos sensibles                                                                               | Fuente de verdad / seguridad; requieren confirmación humana explícita                  |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.js`, Tailwind/PostCSS, Dockerfiles y workflows raíz | Afectan a todo el monorepo                                                             |
| READMEs principales de la plantilla en `./uis/` y `./services/`                                                         | Documentación oficial de estructura                                                    |
| Datos de clientes, `.env`, credenciales y datasets con información identificable                                         | Privacidad y seguridad                                                                 |
| Refactorizaciones amplias de `./memory-bank/*`                                                                           | Requieren revisión previa; las actualizaciones puntuales de estado son parte del flujo |

---

## 4. Estructura de agentes del monorepo

**Separación obligatoria:** `./.agents/` contiene configuración de comportamiento para agentes del workspace (reglas y skills); `./agents/` contiene implementaciones de agentes de TrackFlow; `./skills/` contiene capacidades reutilizables del proyecto. No intercambiar ni duplicar contenido entre estas ubicaciones, y nunca guardar secretos o credenciales en ellas.

| Ruta                | Propósito                                       |
| ------------------- | ----------------------------------------------- |
| `./agents/`         | Agentes de IA internos (copilotos, asistentes)  |
| `./.agents/rules/`  | Reglas de desarrollo (convenciones)             |
| `./.agents/skills/` | Skills reutilizables de validación/verificación |
| `./skills/`         | Skills generales de la plantilla                |
| `./memory-bank/`    | Banco de memoria del proyecto                   |

---

## 5. Definition of Done (DoD)

Un cambio se considera **completado** cuando:

- [ ] Cumple los 5 pasos del flujo obligatorio que apliquen.
- [ ] Respeta los archivos protegidos (o cuenta con confirmación explícita).
- [ ] `memory-bank/progress.md` refleja el nuevo estado.
