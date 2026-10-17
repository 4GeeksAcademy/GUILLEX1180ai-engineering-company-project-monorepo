/**
 * models.ts — Tipos de dominio de TrackFlow
 * ------------------------------------------------------------
 * Nombres de entidades y campos 1:1 con `CONTEXT.es.md` (Hito 1):
 *   - Lead = Solicitudes de información de e-commerce.
 *   - ShipmentOperation = Operaciones logísticas (tracking, peso,
 *     costos y almacén de origen en Los Ángeles o Zaragoza).
 */

/** País de operación principal del solicitante. */
export type CountryCode = 'us' | 'es' | 'both' | 'other';

/** Tipo de producto que comercializa la empresa solicitante. */
export type ProductType = 'fashion' | 'electronics' | 'cosmetics' | 'food' | 'other';

/** Volumen mensual estimado de envíos de la empresa solicitante. */
export type VolumeRange = '0-100' | '101-500' | '501-2000' | '2000+' | 'unsure';

/** Servicio de interés contratable con TrackFlow. */
export type ServiceType = 'warehousing' | 'last-mile' | 'reverse';

/** Situación actual respecto a un proveedor logístico (3PL). */
export type Current3PLStatus = 'yes' | 'no' | 'evaluating';

/** Almacén de origen de una operación de envío (TrackFlow opera en LA y Zaragoza). */
export type WarehouseCode = 'LA' | 'Zaragoza';

/** Estado de vida de una operación de envío. */
export type ShipmentStatus = 'created' | 'in-transit' | 'delivered' | 'incident' | 'returned';

/**
 * Lead — Solicitud de información de una empresa de e-commerce.
 * Los campos coinciden exactamente con el formulario de `CONTEXT.es.md`.
 */
export interface Lead {
  /** Nombre de la empresa (mínimo 2 caracteres, obligatorio). */
  company: string;
  /** Persona de contacto (nombre y apellido, al menos 2 palabras, obligatorio). */
  contact: string;
  /** Email corporativo con formato válido (obligatorio). */
  email: string;
  /** Teléfono con código de país y prefijo `+` (obligatorio). */
  phone: string;
  /** Sitio web de la empresa (opcional; debe ser URL válida si se incluye). */
  website: string;
  /** País de operación principal (obligatorio). */
  country: CountryCode;
  /** Tipo de producto que maneja la empresa (obligatorio). */
  product: ProductType;
  /** Volumen mensual estimado de envíos (obligatorio). */
  volume: VolumeRange;
  /** Servicios de interés; al menos uno (obligatorio). */
  services: ServiceType[];
  /** Indica si actualmente trabaja con otro 3PL (obligatorio). */
  current3PL: Current3PLStatus;
  /** Comentarios o necesidades específicas (opcional, máx. 500 caracteres). */
  comments: string;
  /** Aceptación de la política de privacidad (debe ser true para enviar). */
  privacy: boolean;
}

/**
 * ShipmentOperation — Operación logística de un envío gestionado por TrackFlow.
 * Cubre tracking, peso, costos y el almacén de origen ('LA' | 'Zaragoza').
 */
export interface ShipmentOperation {
  /** Identificador interno de la operación. */
  id: string;
  /** Número de guía / tracking del envío. */
  trackingNumber: string;
  /** Almacén de origen: 'LA' (Los Ángeles) o 'Zaragoza' (España). */
  originWarehouse: WarehouseCode;
  /** Destino del envío (ciudad o región). */
  destination: string;
  /** Servicio contratado para la operación. */
  serviceType: ServiceType;
  /** Peso del envío en kilogramos. */
  weightKg: number;
  /** Costo de la operación en euros. */
  shippingCost: number;
  /** Estado actual de la operación. */
  status: ShipmentStatus;
  /** Fecha de creación de la operación. */
  createdAt: Date;
}

/** Versiones completas soportadas de los enums para validación en runtime. */
export const COUNTRY_CODES: readonly CountryCode[] = ['us', 'es', 'both', 'other'];
export const PRODUCT_TYPES: readonly ProductType[] = [
  'fashion',
  'electronics',
  'cosmetics',
  'food',
  'other',
];
export const VOLUME_RANGES: readonly VolumeRange[] = [
  '0-100',
  '101-500',
  '501-2000',
  '2000+',
  'unsure',
];
export const SERVICE_TYPES: readonly ServiceType[] = ['warehousing', 'last-mile', 'reverse'];
export const CURRENT_3PL_STATUSES: readonly Current3PLStatus[] = ['yes', 'no', 'evaluating'];
export const WAREHOUSES: readonly WarehouseCode[] = ['LA', 'Zaragoza'];