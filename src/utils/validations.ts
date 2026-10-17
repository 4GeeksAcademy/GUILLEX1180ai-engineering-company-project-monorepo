/**
 * validations.ts — Reglas de negocio de TrackFlow.
 * ------------------------------------------------------------
 * Mensajes y restricciones 1:1 con `CONTEXT.es.md`:
 *   - Empresa con mínimo 2 caracteres.
 *   - Contacto con nombre y apellido (>= 2 palabras).
 *   - Email con formato válido.
 *   - Teléfono con prefijo `+` y código de país.
 *   - Sitio web opcional pero debe ser URL http(s) válida.
 *   - Servicios de interés: al menos uno.
 *   - Comentarios: máximo 500 caracteres.
 *   - Privacidad: debe aceptarse.
 *   - Advertencia de eficiencia para volúmenes "0-100".
 */

import type {
  CountryCode,
  Current3PLStatus,
  Lead,
  ProductType,
  ServiceType,
  VolumeRange,
} from '../types/models';
import {
  COUNTRY_CODES,
  CURRENT_3PL_STATUSES,
  PRODUCT_TYPES,
  VOLUME_RANGES,
} from '../types/models';

/** Longitud mínima del nombre de empresa (CONTEXT.es.md: "Mínimo 2 caracteres"). */
const MIN_COMPANY_LENGTH: number = 2;
/** Cantidad mínima de palabras para el contacto (nombre y apellido). */
const MIN_CONTACT_WORDS: number = 2;
/** Longitud máxima de comentarios (CONTEXT.es.md: "Máximo 500 caracteres"). */
const MAX_COMMENTS_LENGTH: number = 500;
/** Rango de volumen que dispara la advertencia de eficiencia. */
const LOW_VOLUME_RANGE: VolumeRange = '0-100';

/** Mensajes de error textuales exactos de CONTEXT.es.md. */
const ERROR_MESSAGES = {
  company: 'El nombre de la empresa debe tener al menos 2 caracteres',
  contact: 'Ingresa nombre y apellido del contacto',
  email: 'Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)',
  phone: 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)',
  website: 'Si incluyes sitio web, debe ser una URL válida',
  country: 'Selecciona el país de operación principal',
  product: 'Selecciona el tipo de producto que manejas',
  volume: 'Selecciona el volumen mensual estimado',
  services: 'Selecciona al menos un servicio de interés',
  current3PL: 'Indica si actualmente trabajas con otro proveedor logístico',
  privacy: 'Debes aceptar la política de privacidad para continuar',
} as const;

/** Advertencia de eficiencia para volúmenes "0-100" (texto exacto de CONTEXT.es.md). */
const LOW_VOLUME_WARNING: string =
  'Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?';

/** Normaliza un valor opcional a una cadena sin espacios extremos. */
function normalize(value: string | undefined): string {
  return value?.trim() ?? '';
}

/** Comprueba que la empresa tenga al menos 2 caracteres. */
function isValidCompany(company: string | undefined): boolean {
  return normalize(company).length >= MIN_COMPANY_LENGTH;
}

/** Comprueba que el contacto tenga al menos 2 palabras (nombre y apellido). */
function isValidContact(contact: string | undefined): boolean {
  return normalize(contact).split(/\s+/).filter(Boolean).length >= MIN_CONTACT_WORDS;
}

/** Comprueba el formato básico de email (presencia de @ y dominio). */
function isValidEmail(email: string | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(email));
}

/** Comprueba que el teléfono comience con `+` seguido del código de país. */
function isValidPhone(phone: string | undefined): boolean {
  return /^\+\d{1,3}(?:[ -]?\d){7,14}$/.test(normalize(phone));
}

/** Comprueba que el sitio web (opcional) sea una URL http(s) válida. */
function isValidWebsite(website: string | undefined): boolean {
  const value = normalize(website);
  if (value === '') {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Comprueba que el valor exista y sea un miembro del conjunto permitido. */
function isValidEnumValue<T extends string>(value: T | undefined, allowed: readonly T[]): boolean {
  return value !== undefined && allowed.includes(value);
}

/** Comprueba que haya al menos un servicio de interés seleccionado. */
function hasSelectedServices(services: ServiceType[] | undefined): boolean {
  return Array.isArray(services) && services.length > 0;
}

/** Comprueba que los comentarios no excedan 500 caracteres. */
function hasValidCommentsLength(comments: string | undefined): boolean {
  return comments === undefined || comments.length <= MAX_COMMENTS_LENGTH;
}

/**
 * Valida un Lead (parcial) contra las reglas de negocio de TrackFlow.
 *
 * @param lead Objeto de tipo `Partial<Lead>` a validar.
 * @returns `isValid` (true si no hay errores) y `errors` (mensajes exactos de CONTEXT.es.md).
 */
export function validateLeadData(lead: Partial<Lead>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidCompany(lead.company)) {
    errors.push(ERROR_MESSAGES.company);
  }
  if (!isValidContact(lead.contact)) {
    errors.push(ERROR_MESSAGES.contact);
  }
  if (!isValidEmail(lead.email)) {
    errors.push(ERROR_MESSAGES.email);
  }
  if (!isValidPhone(lead.phone)) {
    errors.push(ERROR_MESSAGES.phone);
  }
  if (!isValidWebsite(lead.website)) {
    errors.push(ERROR_MESSAGES.website);
  }
  if (!isValidEnumValue<CountryCode>(lead.country, COUNTRY_CODES)) {
    errors.push(ERROR_MESSAGES.country);
  }
  if (!isValidEnumValue<ProductType>(lead.product, PRODUCT_TYPES)) {
    errors.push(ERROR_MESSAGES.product);
  }
  if (!isValidEnumValue<VolumeRange>(lead.volume, VOLUME_RANGES)) {
    errors.push(ERROR_MESSAGES.volume);
  }
  if (!hasSelectedServices(lead.services)) {
    errors.push(ERROR_MESSAGES.services);
  }
  if (!isValidEnumValue<Current3PLStatus>(lead.current3PL, CURRENT_3PL_STATUSES)) {
    errors.push(ERROR_MESSAGES.current3PL);
  }
  if (!hasValidCommentsLength(lead.comments)) {
    const remaining: number = MAX_COMMENTS_LENGTH - (lead.comments?.length ?? 0);
    errors.push(`Los comentarios no pueden exceder 500 caracteres (quedan ${remaining})`);
  }
  if (lead.privacy !== true) {
    errors.push(ERROR_MESSAGES.privacy);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Devuelve la advertencia de eficiencia cuando el volumen mensual estimado
 * es "0-100 envíos/mes" (restricción específica de CONTEXT.es.md).
 *
 * @param volume Volumen mensual estimado (string opcional).
 * @returns El mensaje de advertencia, o `null` si el volumen es adecuado.
 */
export function checkVolumeEfficiency(volume?: string): string | null {
  return volume === LOW_VOLUME_RANGE ? LOW_VOLUME_WARNING : null;
}

// Re-export útil para la demo: longitud máxima de comentarios.
export { ERROR_MESSAGES as LEAD_ERROR_MESSAGES, MAX_COMMENTS_LENGTH };