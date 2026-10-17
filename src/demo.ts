/**
 * demo.ts — Script de demostración de la capa de procesamiento de datos.
 * ------------------------------------------------------------
 * Ejecuta cada función exportada de la capa lógica con datos mock
 * representativos de TrackFlow.
 *
 * Ejecutar con:  npx tsx src/demo.ts
 */

import type { Lead, ShipmentOperation } from './types/models';
import {
  filterByCriteria,
  filterByProperty,
  groupByProperty,
  sortByProperty,
} from './utils/collections';
import { binarySearch, linearSearch } from './utils/search';
import {
  calculateAverage,
  countByCategory,
  findMinMax,
  sumByProperty,
} from './utils/transformations';
import { checkVolumeEfficiency, MAX_COMMENTS_LENGTH, validateLeadData } from './utils/validations';

/* ------------------------------------------------------------------ */
/* Datos mock representativos de TrackFlow                             */
/* ------------------------------------------------------------------ */

/** Leade: solicitudes de información de empresas e-commerce. */
const LEADS: readonly Lead[] = [
  {
    company: 'ModaNorte',
    contact: 'Lucía Fernández',
    email: 'lucia@modanorte.com',
    phone: '+34 976 555 100',
    website: 'https://modanorte.com',
    country: 'es',
    product: 'fashion',
    volume: '501-2000',
    services: ['warehousing', 'last-mile'],
    current3PL: 'yes',
    comments: 'Necesitamos almacenaje en Zaragoza para la campaña de invierno.',
    privacy: true,
  },
  {
    company: 'ElektraShop',
    contact: 'Michael Chen',
    email: 'm.chen@elektrashop.us',
    phone: '+1 213 555 0147',
    website: 'https://elektrashop.us',
    country: 'us',
    product: 'electronics',
    volume: '2000+',
    services: ['warehousing', 'last-mile', 'reverse'],
    current3PL: 'no',
    comments: 'Interesados en logística inversa de dispositivos.',
    privacy: true,
  },
  {
    company: 'BellezaRosa',
    contact: 'Ana García López',
    email: 'ana@bellezarosa.es',
    phone: '+34 676 123 456',
    website: 'https://bellezarosa.es',
    country: 'both',
    product: 'cosmetics',
    volume: '0-100',
    services: ['last-mile'],
    current3PL: 'evaluating',
    comments: 'Pequeño catálogo de cosmética natural; evaluando expansión.',
    privacy: true,
  },
  {
    company: 'TechUS',
    contact: 'Sarah Johnson',
    email: 'sarah@techus.com',
    phone: '+1 415 555 0199',
    website: '',
    country: 'us',
    product: 'electronics',
    volume: '101-500',
    services: ['reverse'],
    current3PL: 'yes',
    comments: '',
    privacy: false,
  },
];

/** Operaciones logísticas reales de TrackFlow (LA y Zaragoza). */
const OPERATIONS: readonly ShipmentOperation[] = [
  {
    id: 'OP-001',
    trackingNumber: 'TF-US-0001',
    originWarehouse: 'LA',
    destination: 'Seattle',
    serviceType: 'last-mile',
    weightKg: 12.5,
    shippingCost: 45.0,
    status: 'in-transit',
    createdAt: new Date('2025-10-01T10:00:00Z'),
  },
  {
    id: 'OP-002',
    trackingNumber: 'TF-ES-0002',
    originWarehouse: 'Zaragoza',
    destination: 'Madrid',
    serviceType: 'last-mile',
    weightKg: 3.2,
    shippingCost: 18.5,
    status: 'delivered',
    createdAt: new Date('2025-10-02T09:30:00Z'),
  },
  {
    id: 'OP-003',
    trackingNumber: 'TF-US-0003',
    originWarehouse: 'LA',
    destination: 'Austin',
    serviceType: 'reverse',
    weightKg: 8.0,
    shippingCost: 30.0,
    status: 'incident',
    createdAt: new Date('2025-10-03T14:00:00Z'),
  },
  {
    id: 'OP-004',
    trackingNumber: 'TF-ES-0004',
    originWarehouse: 'Zaragoza',
    destination: 'Barcelona',
    serviceType: 'warehousing',
    weightKg: 22.7,
    shippingCost: 60.0,
    status: 'delivered',
    createdAt: new Date('2025-10-04T11:15:00Z'),
  },
];

/* ------------------------------------------------------------------ */
/* Helper de salida formateada                                         */
/* ------------------------------------------------------------------ */

/** Imprime un encabezado de sección en la consola. */
function printSection(title: string): void {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(64));
}

/** Imprime un objeto de forma legible. */
function printValue<T>(label: string, value: T): void {
  console.log(`\n${label}:`);
  console.log(JSON.stringify(value, null, 2));
}

/* ------------------------------------------------------------------ */
/* Colecciones: filtrado y ordenamiento                                */
/* ------------------------------------------------------------------ */

printSection('collections.ts — Filtrado');

// Filtro por una única propiedad.
const usLeads: Lead[] = filterByProperty<Lead, 'country'>(LEADS, 'country', 'us');
printValue('filterByProperty(LEADS, "country", "us")', usLeads.map((l) => l.company));

// Filtro por múltiples criterios (AND).
const electronicsInUS: Lead[] = filterByCriteria<Lead>(LEADS, {
  country: 'us',
  product: 'electronics',
});
printValue(
  'filterByCriteria({ country: "us", product: "electronics" })',
  electronicsInUS.map((l) => l.company),
);

printSection('collections.ts — Ordenamiento');

// Ordenamiento ascendente por empresa.
const sortedByName: Lead[] = sortByProperty<Lead, 'company'>(LEADS, 'company', 'asc');
printValue(
  'sortByProperty(LEADS, "company", "asc")',
  sortedByName.map((l) => l.company),
);

// Ordenamiento descendente por peso de envío.
const heaviestFirst: ShipmentOperation[] = sortByProperty<ShipmentOperation, 'weightKg'>(
  OPERATIONS,
  'weightKg',
  'desc',
);
printValue(
  'sortByProperty(OPERATIONS, "weightKg", "desc")',
  heaviestFirst.map((o) => `${o.trackingNumber}: ${o.weightKg} kg`),
);

printSection('collections.ts — Agrupación');

// Agrupación de leads por país.
const groupedByCountry: Record<string, Lead[]> = groupByProperty<Lead, 'country'>(
  LEADS,
  'country',
);
printValue(
  'groupByProperty(LEADS, "country")',
  Object.fromEntries(
    Object.entries(groupedByCountry).map(([k, v]) => [k, v.map((l) => l.company)]),
  ),
);

// Agrupación de operaciones por almacén de origen.
const groupedByWarehouse: Record<string, ShipmentOperation[]> = groupByProperty<
  ShipmentOperation,
  'originWarehouse'
>(OPERATIONS, 'originWarehouse');
printValue(
  'groupByProperty(OPERATIONS, "originWarehouse")',
  Object.fromEntries(
    Object.entries(groupedByWarehouse).map(([k, v]) => [k, v.length]),
  ),
);

/* ------------------------------------------------------------------ */
/* Búsqueda lineal y binaria                                           */
/* ------------------------------------------------------------------ */

printSection('search.ts — Búsqueda lineal');

// Búsqueda lineal sobre colección desordenada.
const foundByPredicate: Lead | null = linearSearch<Lead>(
  LEADS,
  (lead) => lead.volume === '0-100',
);
printValue(
  'linearSearch(LEADS, lead => lead.volume === "0-100")',
  foundByPredicate?.company ?? null,
);

const notFound: Lead | null = linearSearch<Lead>(LEADS, (lead) => lead.company === 'Inexistente');
printValue('linearSearch(...) sin coincidencias', notFound);

printSection('search.ts — Búsqueda binaria');

// La búsqueda binaria requiere una colección ORDENADA por la clave de búsqueda.
const sortedByTracking: ShipmentOperation[] = sortByProperty<ShipmentOperation, 'trackingNumber'>(
  OPERATIONS,
  'trackingNumber',
  'asc',
);

const foundBinary: ShipmentOperation | null = binarySearch<ShipmentOperation, 'trackingNumber'>(
  sortedByTracking,
  'trackingNumber',
  'TF-US-0003',
);
printValue(
  'binarySearch(sortedByTracking, "trackingNumber", "TF-US-0003")',
  foundBinary ? `${foundBinary.trackingNumber} -> ${foundBinary.destination}` : null,
);

const notFoundBinary: ShipmentOperation | null = binarySearch<ShipmentOperation, 'trackingNumber'>(
  sortedByTracking,
  'trackingNumber',
  'TF-NO-EXISTE',
);
printValue('binarySearch(...) sin coincidencias', notFoundBinary);

/* ------------------------------------------------------------------ */
/* Transformaciones: agregaciones y extremos                           */
/* ------------------------------------------------------------------ */

printSection('transformations.ts — Agregaciones');

// Conteo por categoría (países de los leads).
const leadsByCountry: Record<string, number> = countByCategory<Lead, 'country'>(LEADS, 'country');
printValue('countByCategory(LEADS, "country")', leadsByCountry);

// Conteo por categoría (almacén de origen de operaciones).
const opsByWarehouse: Record<string, number> = countByCategory<ShipmentOperation, 'originWarehouse'>(
  OPERATIONS,
  'originWarehouse',
);
printValue('countByCategory(OPERATIONS, "originWarehouse")', opsByWarehouse);

// Suma de costos de envío.
const totalCost: number = sumByProperty<ShipmentOperation>(OPERATIONS, 'shippingCost');
printValue('sumByProperty(OPERATIONS, "shippingCost") (€)', totalCost);

// Promedio de peso.
const avgWeight: number = calculateAverage<ShipmentOperation>(OPERATIONS, 'weightKg');
printValue('calculateAverage(OPERATIONS, "weightKg") (kg)', Number(avgWeight.toFixed(2)));

// Extremos de peso.
const minMaxWeight = findMinMax<ShipmentOperation>(OPERATIONS, 'weightKg');
printValue(
  'findMinMax(OPERATIONS, "weightKg")',
  minMaxWeight.min && minMaxWeight.max
    ? {
        min: `${minMaxWeight.min.trackingNumber} (${minMaxWeight.min.weightKg} kg)`,
        max: `${minMaxWeight.max.trackingNumber} (${minMaxWeight.max.weightKg} kg)`,
      }
    : null,
);

/* ------------------------------------------------------------------ */
/* Validaciones de negocio                                            */
/* ------------------------------------------------------------------ */

printSection('validations.ts — Validación de Lead');

// Lead válido (BellezaRosa con volumen 0-100).
const validLead: Lead = {
  company: 'BellezaRosa',
  contact: 'Ana García López',
  email: 'ana@bellezarosa.es',
  phone: '+34 676 123 456',
  website: 'https://bellezarosa.es',
  country: 'both',
  product: 'cosmetics',
  volume: '0-100',
  services: ['last-mile'],
  current3PL: 'evaluating',
  comments: 'Evaluando expansión a EE. UU.',
  privacy: true,
};
printValue('validateLeadData(lead válido)', validateLeadData(validLead));

// Lead inválido (todos los errores posibles).
const invalidLead: Partial<Lead> = {
  company: 'A',
  contact: 'SoloNombre',
  email: 'correo-sin-arroba',
  phone: '123456',
  website: 'ftp://no-http.com',
  country: 'mexico' as never, // valor fuera del union type
  product: 'books' as never,
  volume: 'unlimited' as never,
  services: [],
  current3PL: 'maybe' as never,
  comments: 'X'.repeat(MAX_COMMENTS_LENGTH + 10),
  privacy: false,
};
printValue('validateLeadData(lead inválido)', validateLeadData(invalidLead));

// Lead parcial (solo los campos presentes se validan cuando existen).
const partialLead: Partial<Lead> = {
  company: 'FastBox',
  email: 'hola@fastbox.com',
  phone: '+1 555 0100',
};
printValue(
  'validateLeadData({ company, email, phone })',
  validateLeadData(partialLead),
);

printSection('validations.ts — Eficiencia de volumen');

// Volumen bajo (advertencia).
const warningLow: string | null = checkVolumeEfficiency('0-100');
printValue('checkVolumeEfficiency("0-100")', warningLow);

// Volumen adecuado (sin advertencia).
const warningOk: string | null = checkVolumeEfficiency('501-2000');
printValue('checkVolumeEfficiency("501-2000")', warningOk);

// Volumen indefinido (sin advertencia).
const warningUndefined: string | null = checkVolumeEfficiency(undefined);
printValue('checkVolumeEfficiency(undefined)', warningUndefined);

/* ------------------------------------------------------------------ */
/* Cierre                                                              */
/* ------------------------------------------------------------------ */

printSection('Demo finalizada');
console.log('Capas importadas y ejecutadas correctamente:');
console.log('  ✔ src/types/models.ts');
console.log('  ✔ src/utils/collections.ts');
console.log('  ✔ src/utils/search.ts');
console.log('  ✔ src/utils/transformations.ts');
console.log('  ✔ src/utils/validations.ts');