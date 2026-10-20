---
name: validate-landing-form
description: Validar que la landing page B2B y el formulario de contacto de TrackFlow cumplen los requisitos de BRIEFING.md.
version: 1.0.0
tags: [trackflow, landing, form, validation, qa, schema-org]
---

# Skill: `validate-landing-form`

## Objetivo Único

**Validar** que el **sitio web** y el **formulario** cumplen con los requisitos de `BRIEFING.md`.
La skill es **pass/fail**, no produce cambios de código: solo evalúa y reporta. El sitio actual está en la raíz (`index.html`, `application.html`, `validation.js`); tras la migración, inspeccionar `./uis/website`.

## Inputs Documentados

| Input | Descripción | Fuente |
|---|---|---|
| Archivos de la aplicación | Código fuente del sitio público + formulario | Raíz actual; `./uis/website` después de la migración |
| Matriz de validación y mensajes de error | Campos del formulario, mensajes de error y validaciones | `BRIEFING.md` (campos, validaciones, mensajes y advertencia) |

## Pasos de ejecución

1. **Leer la fuente de verdad**: `BRIEFING.md` (secciones de formulario y validaciones).
2. **Inspeccionar el código fuente**: `index.html`, `application.html`, `validation.js` y los recursos que importen; después de la migración, revisar `./uis/website`.
3. **Evaluar cada criterio de aceptación** (abajo) y registrar ✔/✘ por criterio.
4. **Reportar**: devolver un informe detallado con el resultado por criterio.

## Criterios de Aceptación Verificables

### C1 — Secciones principales de la landing (6 secciones)
✔ La landing contiene, en orden: **Header**, **Hero**, **Servicios** (3 columnas),
**Cobertura** (2 columnas), **Beneficios** (4), **Contacto/Footer**.

### C2 — Los 12 campos del formulario
✔ El formulario incluye los **12 campos** del briefing con sus atributos de validación:

| # | Campo | Obligatorio |
|---|---|---|
| 1 | Nombre de la empresa (text) | Sí |
| 2 | Persona de contacto (text) | Sí |
| 3 | Email corporativo (email) | Sí |
| 4 | Teléfono (tel) | Sí |
| 5 | Sitio web de la empresa (url) | No |
| 6 | País de operación principal (select) | Sí |
| 7 | Tipo de producto (select) | Sí |
| 8 | Volumen mensual de envíos (select) | Sí |
| 9 | Servicios de interés (checkbox) | Sí |
| 10 | ¿Trabajas con otro 3PL? (radio) | Sí |
| 11 | Comentarios (textarea) | No |
| 12 | Acepto política de privacidad (checkbox) | Sí |

✔ Cada campo tiene su tipo HTML (`text`/`email`/`tel`/`url`/`select`/`textarea`/`checkbox`/`radio`), asociado a su `<label>`.

### C3 — Mensajes de error exactos
✔ Los mensajes de error del formulario son **idénticos** a la tabla de `BRIEFING.md`,
incluidos:
- `El nombre de la empresa debe tener al menos 2 caracteres`
- `Ingresa nombre y apellido del contacto`
- `Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)`
- `El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)`
- `Si incluyes sitio web, debe ser una URL válida`
- `Selecciona el país de operación principal`
- `Selecciona el tipo de producto que manejas`
- `Selecciona el volumen mensual estimado`
- `Selecciona al menos un servicio de interés`
- `Indica si actualmente trabajas con otro proveedor logístico`
- `Los comentarios no pueden exceder 500 caracteres (quedan X)`
- `Debes aceptar la política de privacidad para continuar`

### C4 — Advertencia lógica para volumen "0-100 envíos/mes"
✔ Si el usuario selecciona volumen **"0-100 envíos/mes"**, el formulario muestra:
> *"Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?"*

### C5 — Marcado Schema.org válido
✔ La landing contiene un bloque JSON-LD tipo **`Organization`** válido (con `name`, `description`, `url`, `foundingDate`, `address` US/ES, `contactPoint`, `sameAs`, `areaServed`), parseable como JSON.

## Criterios opcionales (recomendados)

- **C6 — Responsive & Accesibilidad:** vista móvil funcional; labels asociados, contraste AA, foco visible.
- **C7 — Mensaje de éxito:** al validar el formulario se muestra el mensaje de éxito del briefing (simulación de envío).

## Output de la skill

Un informe conciso por criterio, p. ej.:

```
validate-landing-form — Resultado
  C1 Secciones (6) ........ ✔
  C2 Campos (12) .......... ✔
  C3 Mensajes exactos ..... ✔
  C4 Advertencia 0-100 .... ✔
  C5 Schema.org ........... ✔
  C6 Responsive/Acc ........ ✔ (opcional)
  C7 Mensaje éxito ........ ✔ (opcional)
  RESULTADO: PASS ✔
```

## Alcance / No aplica

- **Aplicable a:** la ubicación actual del sitio en la raíz y, una vez migrado, `./uis/website` (sitio público + formulario).
- **No modifica código**: la skill es de verificación (QA). Los cambios los aplica el agente ejecutor tras el reporte.
- **Reglas relacionadas:** `.agents/rules/app-structure-and-code.md` (estructura de aplicación y convenciones de código).