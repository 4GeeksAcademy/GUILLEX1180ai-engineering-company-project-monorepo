# Project Brief — TrackFlow

> Documento raíz del banco de memoria. Define **qué** construye TrackFlow y **por qué**.
> Fuente de verdad de negocio: [`BRIEFING.md`](../BRIEFING.md).

## Negocio

**TrackFlow** es una empresa de **gestión de almacenes (SGA/WMS) y entregas de última milla** fundada en **2009** en Los Ángeles, Estados Unidos.

- **Empleados:** ~130 profesionales.
- **Facturación anual:** ~9 millones de euros (9M€).
- **Operación binacional:** Estados Unidos (Los Ángeles) y España (Zaragoza).
- **Almacenes propios:** Los Ángeles (EE. UU.) y Zaragoza (España).
- **Clientes:** marcas medianas de e-commerce en moda, electrónica y cosmética que venden en línea.

TrackFlow opera almacenes en Los Ángeles y Zaragoza y ofrece gestión de almacenes, entregas de última milla y logística inversa (devoluciones, inspección y reacondicionamiento).

## Servicios

TrackFlow ofrece **tres servicios** de logística para e-commerce:

1. **Gestión de Almacenes** — almacenamiento, picking y packing, inventario en tiempo real.
2. **Entregas de Última Milla** — red de carriers certificados, seguimiento unificado de envíos, gestión de incidencias y devoluciones.
3. **Logística Inversa** — devoluciones, inspección y reacondicionamiento de productos, integración con la plataforma de ventas.

## Problema a Resolver

El sitio web corporativo está desactualizado: no explica la operación en Estados Unidos y España ni los tres servicios, y no cualifica de forma estructurada a las empresas interesadas. El Director Comercial, Miguel Torres, necesita presentar TrackFlow y recibir solicitudes de empresas que buscan externalizar su logística.

## Objetivo

Implementar el **sitio público B2B** y el **formulario de cualificación de leads** (solicitud de información), con destino oficial en `./uis/website`, con:

- Validaciones estrictas por campo (mensajes de error exactos del contexto).
- Advertencia de eficiencia para **volúmenes bajos (<100 envíos/mes)**: _"Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?"_
- Marcado **Schema.org** (`Organization`) y diseño responsive/SEO.

El formulario debe capturar 12 datos: empresa, contacto, email, teléfono, sitio web opcional, país principal, tipo de producto, volumen mensual, servicios de interés, relación actual con otro 3PL, comentarios opcionales y aceptación de privacidad.

## Restricciones del Hito 1

- El sitio está dirigido a **empresas e-commerce** que buscan externalizar logística (no a consumidores finales).
- Capturar 12 campos de cualificación (datos empresa, tipo de producto, volumen mensual, países, servicios de interés, 3PL actual).
- Soporte multiidioma opcional; el idioma base es una única experiencia completa. El sitio está dirigido a empresas de e-commerce, no a consumidores que quieren rastrear paquetes o tramitar devoluciones.
