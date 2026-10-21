# Registro de Configuración y Avance: Hitos 1 a 4

**Proyecto:** TrackFlow Tech
**Actualizado:** 2026-10-20
**Fuente canónica de negocio:** [`../BRIEFING.md`](../BRIEFING.md)

Este documento resume la configuración y el trabajo registrado en el monorepo desde el inicio de la conversación de proyecto. Distingue entregables implementados, verificaciones realizadas y tareas pendientes; no atribuye requisitos a hitos que no estén especificados.

## Resumen ejecutivo

- **Hito 1:** sitio B2B y formulario construidos en la raíz del monorepo; la migración a `./uis/website` sigue pendiente.
- **Hito 2:** modelos y utilidades TypeScript, más una consola interactiva de demostración; es un avance parcial, no un sistema operacional.
- **Hitos 3 y 4:** `BRIEFING.md` no define su alcance. No hay base para certificar su implementación.
- **Infraestructura de agentes:** banco de memoria, protocolo global, regla de estructura y skill de validación documentados.
- **Entrega Git:** commit `4a45455` subido a `origin/feature/agent-memory-bank`.

## Hito 1: Sitio público B2B

### Objetivo de negocio

TrackFlow es un operador logístico fundado en 2009 en Los Ángeles, con operación y almacenes en Los Ángeles y Zaragoza. Atiende marcas medianas de e-commerce de moda, electrónica y cosmética, ofrece gestión de almacenes, última milla y logística inversa, y busca sustituir un sitio corporativo desactualizado por una presencia que explique sus servicios y cualifique solicitudes comerciales.

### Implementación registrada

- Landing pública en `index.html`, formulario en `application.html` y validación en `validation.js`, actualmente en la raíz.
- Contenido de marca para presencia en Estados Unidos y España, servicios, cobertura, ventajas y contacto.
- Formulario de 12 campos para calificar empresas interesadas en externalizar logística.
- Validaciones con los mensajes definidos en `BRIEFING.md`, contador de comentarios, aceptación de privacidad y simulación de envío exitoso.
- Advertencia y confirmación para el rango de volumen de 0–100 envíos mensuales.
- Marcado Schema.org `Organization` (JSON-LD) en la landing.

### Estado y pendientes

La implementación funcional vive todavía en la raíz, mientras que la estructura oficial es `./uis/website`. La migración está pendiente y debe seguir el README de `uis/`; no se debe crear una copia paralela. La skill `.agents/skills/validate-landing-form/SKILL.md` documenta criterios para revisar secciones, 12 campos, textos de error, advertencia, JSON-LD, accesibilidad y mensaje de éxito.

El formulario simula el envío en el navegador; no se ha documentado una API que persista o procese los leads.

## Hito 2: Modelos y procesamiento de datos

### Implementación registrada

- Tipos de dominio en `src/types/models.ts`, incluidos `Lead` y `ShipmentOperation`, con valores para países, productos, volúmenes, servicios, almacenes y estados de envío.
- Utilidades TypeScript en `src/utils/` para comparación, filtrado, ordenamiento, agrupación, búsqueda, transformaciones, agregaciones y validaciones.
- `src/demo.ts` contiene datos mock y ejecuta las operaciones de demostración.
- `console.html` y `src/interactive-demo.ts` proporcionan una interfaz de prueba para filtrar leads, ordenar operaciones, buscar envíos y mostrar agregaciones.

### Estado y límites

El progreso se registra como **parcial**. Los datos son mocks y la consola es una demostración; no debe describirse como backoffice ni como aplicación logística en producción. La implementación actual está en la raíz y `src/`, pendiente de una decisión de migración o modularización compatible con la estructura oficial.

## Hitos 3 y 4

`BRIEFING.md` especifica los requisitos del sitio público B2B del Hito 1, pero no establece criterios de aceptación ni entregables para los Hitos 3 y 4. Por tanto:

- No se declaran completados ni iniciados por inferencia.
- Antes de implementarlos, solicitar y documentar su alcance oficial.
- Todo frontend nuevo debe respetar `./uis/website` o `./uis/backoffice`; todo backend nuevo debe ir en `./services`.

## Infraestructura transversal de agentes

### Banco de memoria

- `memory-bank/projectbrief.md`: negocio, problema del sitio desactualizado, servicios y objetivo de captación de leads.
- `memory-bank/techContext.md`: stack actual, rutas oficiales, estado de migración y restricciones.
- `memory-bank/progress.md`: hitos implementados, parcialidades y roadmap.

### Protocolo y personalizaciones

- `AGENTS.md` requiere leer `BRIEFING.md` y los tres documentos del banco de memoria al inicio.
- Define cinco pasos pre-commit: requisitos y alcance; rutas y límites; verificaciones configuradas; actualización de memoria; commit estandarizado solo con autorización.
- Protege `BRIEFING.md`, configuraciones globales, READMEs de plantilla, datos sensibles y refactorizaciones amplias de memoria.
- `.agents/rules/app-structure-and-code.md` declara `applyTo: "**"` y cubre estructura, Tailwind, accesibilidad, mensajes exactos y prevención de rutas paralelas.
- `.agents/skills/validate-landing-form/SKILL.md` define una tarea pass/fail con inputs y criterios verificables.
- Se conserva la separación: `.agents/` configura el comportamiento de agentes del workspace; `agents/` contiene implementaciones de agentes de TrackFlow; `skills/` contiene capacidades reutilizables. No mezclar ni duplicar estas funciones.

### Estructura oficial de aplicación

```text
./uis/                 Contenedor de proyectos frontend
./uis/website/         Sitio público B2B (ruta /), contenido alineado con BRIEFING.md
./uis/backoffice/      Administración interna, layout separado, ruta / de su aplicación
./services/            APIs, microservicios y servicios backend
```

Está **estrictamente prohibido** crear árboles paralelos como `/frontend`, `/backend`, `/apps`, `/api` o `src/website`. El README de cada carpeta involucrada debe leerse antes de añadir código. Al actualizar este registro, los README generales de `uis/` y `services/` existen; no se encontraron README específicos de `uis/website` ni `uis/backoffice` y esas dos carpetas no estaban creadas.

## Stack y comandos comprobados

El proyecto web utiliza Vite, HTML, Tailwind CSS, JavaScript vanilla y TypeScript. `package.json` contiene estos scripts:

| Comando            | Uso                                                    |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Servidor Vite de desarrollo (puerto 3000 por defecto). |
| `npm run build`    | Compilación de producción a `dist/`.                   |
| `npm run preview`  | Vista previa de la compilación.                        |
| `npm run ts:check` | Typecheck TypeScript sin emitir archivos.              |
| `npm run ts:demo`  | Ejecuta `src/demo.ts` con `tsx`.                       |

No hay scripts `lint` ni `test` definidos en `package.json`; no se deben reportar como ejecutados.

## Python y análisis de datos

- El intérprete seleccionado en el entorno de VS Code fue Python 3.12.15, ubicado en `/usr/local/python/3.12.15/bin/python`.
- Se instaló `pandas` 3.0.6 en ese entorno para ejecutar `skills/data-analysis/scripts/pandas_clean.py`.
- Se probó el script con un CSV de ejemplo temporal: cargó tres filas, eliminó una columna completamente vacía y detectó una fila duplicada. El archivo temporal se eliminó al terminar.
- La instalación es del entorno seleccionado, no una dependencia declarada por el proyecto: no se agregó `requirements.txt` ni metadato de dependencias Python.

## Despliegue y estado Git

- La configuración existente `.github/workflows/deploy.yml` compila el proyecto con Node 22 y publica `dist/` mediante GitHub Pages.
- El workflow se ejecuta manualmente o al hacer push a `main`; subir una rama feature no activa ese despliegue automático.
- Durante las pruebas locales, Vite respondió HTTP 200 en `http://localhost:3000/` y `http://localhost:3001/`; el segundo puerto se usó al encontrar ocupado el primero.
- Los documentos de infraestructura y `BRIEFING.md` quedaron en el commit `4a45455` (`feat(setup): add memory-bank, AGENTS.md, rules, and skills for AI agent workflow`), subido a `origin/feature/agent-memory-bank`.

## Verificaciones registradas

En la rama `feature/agent-memory-bank` se ejecutaron correctamente:

- `npm run ts:check`
- `npm run build`
- `npm run ts:demo`
- `git diff --check`
- Importación de `pandas` desde el intérprete configurado.
- Ejecución de `skills/data-analysis/scripts/pandas_clean.py` con datos temporales de prueba.

Estas verificaciones prueban compilación y demos; no sustituyen una prueba integral de navegador, persistencia de leads, API ni los criterios todavía no definidos de Hitos 3 y 4.
