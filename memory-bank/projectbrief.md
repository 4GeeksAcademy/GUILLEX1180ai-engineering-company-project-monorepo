# Project Brief — TrackFlow

> Documento raíz del banco de memoria. Define **qué** construye TrackFlow y **por qué**.
> Fuente de verdad: [`CONTEXT.es.md`](../CONTEXT.es.md).

## Negocio

**TrackFlow** es una empresa de **gestión de almacenes (SGA/WMS) y entregas de última milla** fundada en **2009** en Los Ángeles, Estados Unidos.

- **Empleados:** ~130 profesionales.
- **Facturación anual:** ~9 millones de euros (9M€).
- **Operación binacional:** Estados Unidos (Los Ángeles) y España (Zaragoza).
- **Almacenes propios:** Los Ángeles (EE. UU.) y Zaragoza (España).
- **Clientes:** marcas medianas de e-commerce en moda, electrónica y cosmética que venden en línea.

## Servicios

TrackFlow ofrece **tres servicios** de logística para e-commerce:

1. **Gestión de Almacenes** — almacenamiento, picking y packing, inventario en tiempo real.
2. **Entregas de Última Milla** — red de carriers certificados, seguimiento unificado de envíos, gestión de incidencias y devoluciones.
3. **Logística Inversa** — devoluciones, inspección y reacondicionamiento de productos, integración con la plataforma de ventas.

## Problema a Resolver

El departamento **TrackFlow Tech** (reporta al CTO Andrés Kim) debe resolver la situación actual de la compañía:

- **Sistemas SGA desconectados** entre los almacenes de EE. UU. y España.
- **Procesos manuales de devoluciones** (logística inversa poco automatizada).
- **Falta de visibilidad binacional** en tiempo real del inventario.
- **Un sitio web desactualizado**: no refleja que la empresa opera en dos países, no explica los servicios y no canaliza leads de forma estructurada.

## Objetivo

Construir la **infraestructura del monorepo** e implementar en `./uis/website` el **sitio público B2B** y el **formulario de cualificación de leads** (solicitud de información), con:

- Validaciones estrictas por campo (mensajes de error exactos del contexto).
- Advertencia de eficiencia para **volúmenes bajos (<100 envíos/mes)**: _"Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?"_
- Marcado **Schema.org** (`Organization`) y diseño responsive/SEO.

## Restricciones del Hito 1

- El sitio está dirigido a **empresas e-commerce** que buscan externalizar logística (no a consumidores finales).
- Capturar 12 campos de cualificación (datos empresa, tipo de producto, volumen mensual, países, servicios de interés, 3PL actual).
- Soporte multiidioma opcional; el idioma base es una única experiencia completa.
