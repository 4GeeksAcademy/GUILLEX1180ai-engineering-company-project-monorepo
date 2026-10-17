/**
 * interactive-demo.ts — Interfaz de pruebas interactiva de TrackFlow
 * ------------------------------------------------------------------
 * Panel de control (Hito 2) que evalúa visualmente las funciones de la
 * capa de procesamiento de datos. Escucha los clics de los botones de
 * `console.html` e inyecta los resultados (JSON formateado) en el
 * elemento `<pre id="output-console">`.
 *
 * Ejecutar con el servidor de desarrollo:  npm run dev
 * Luego abrir:  http://localhost:3000/console.html
 */

import type { Lead, ShipmentOperation } from './types/models';
import { filterByProperty, sortByProperty } from './utils/collections';
import { binarySearch } from './utils/search';
import {
  countByCategory,
  sumByProperty,
  calculateAverage,
} from './utils/transformations';

/* ------------------------------------------------------------------ */
/* Datos ficticios (Mocks) basados en CONTEXT.es.md                    */
/* ------------------------------------------------------------------ */

/** Leads: solicitudes de información de empresas e-commerce. */
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
    comments: 'Almacenaje en Zaragoza para la campaña de invierno.',
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
    comments: 'Evaluando expansión a EE. UU.',
    privacy: true,
  },
  {
    company: 'TechUS',
    contact: 'Sarah Johnson',
    email: 'sarah@techus.com',
    phone: '+1 415 555 0199',
    website: 'https://techus.com',
    country: 'us',
    product: 'electronics',
    volume: '101-500',
    services: ['reverse'],
    current3PL: 'yes',
    comments: '',
    privacy: false,
  },
];

/** Envíos: operaciones logísticas gestionadas por TrackFlow (LA y Zaragoza). */
const OPERATIONS: readonly ShipmentOperation[] = [
  {
    id: '101',
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
    id: '102',
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
    id: '103',
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
    id: '104',
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
/* Helpers de salida                                                    */
/* ------------------------------------------------------------------ */

/** Elemento `<pre>` que funciona como consola de salida. */
const outputConsole: HTMLPreElement | null =
  document.querySelector<HTMLPreElement>('#output-console');

/**
 * Formatea un resultado como JSON legible y lo inyecta en la consola.
 * Falta de forma segura si el elemento no existe (no rompe la página).
 */
function printResult(label: string, data: unknown): void {
  if (outputConsole === null) {
    return;
  }

  const separator = '─'.repeat(Math.min(60, Math.max(label.length + 4, 24)));
  const block = [
    '',
    `// ${'═'.repeat(separator.length)}`,
    `// ${label}`,
    `// ${'═'.repeat(separator.length)}`,
    JSON.stringify(data, null, 2),
    '',
  ].join('\n');

  outputConsole.textContent = `${outputConsole.textContent ?? ''}${block}`;
  outputConsole.scrollTop = outputConsole.scrollHeight;

  // También a la consola del navegador para depuración.
  console.log(`[TrackFlow] ${label}`, data);
}

/* ------------------------------------------------------------------ */
/* Acciones de los botones                                              */
/* ------------------------------------------------------------------ */

/** Botón 1 — Filtrar Leads (US): filterByProperty(LEADS, "country", "us"). */
function runFilterLeadsUS(): void {
  const result: Lead[] = filterByProperty<Lead, 'country'>(LEADS, 'country', 'us');

  printResult('Filtrar Leads (US)', {
    operacion: 'filterByProperty(LEADS, "country", "us")',
    total: result.length,
    leads: result.map((lead: Lead) => ({
      company: lead.company,
      country: lead.country,
      product: lead.product,
      volume: lead.volume,
    })),
  });
}

/** Botón 2 — Ordenar Envíos por Peso: sortByProperty(OPERATIONS, "weightKg", "desc"). */
function runSortShipmentsByWeight(): void {
  const result: ShipmentOperation[] = sortByProperty<ShipmentOperation, 'weightKg'>(
    OPERATIONS,
    'weightKg',
    'desc',
  );

  printResult('Ordenar Envíos por Peso (desc)', {
    operacion: 'sortByProperty(OPERATIONS, "weightKg", "desc")',
    total: result.length,
    envios: result.map((shipment: ShipmentOperation) => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      originWarehouse: shipment.originWarehouse,
      destination: shipment.destination,
      weightKg: shipment.weightKg,
    })),
  });
}

/** Botón 3 — Búsqueda Binaria (ID 103): exige colección ordenada por id. */
function runBinarySearch(): void {
  const sortedById: ShipmentOperation[] = sortByProperty<ShipmentOperation, 'id'>(
    OPERATIONS,
    'id',
    'asc',
  );

  const targetId: string = '103';
  const found: ShipmentOperation | null = binarySearch<ShipmentOperation, 'id'>(
    sortedById,
    'id',
    targetId,
  );

  printResult(`Búsqueda Binaria (ID ${targetId})`, {
    operacion: 'binarySearch(sortedById, "id", "103") ≈ O(log n)',
    coleccionOrdenadaPorId: sortedById.map((shipment: ShipmentOperation) => shipment.id),
    encontrado: found
      ? {
          id: found.id,
          trackingNumber: found.trackingNumber,
          originWarehouse: found.originWarehouse,
          destination: found.destination,
          serviceType: found.serviceType,
          status: found.status,
          weightKg: found.weightKg,
        }
      : null,
  });
}

/** Botón 4 — Reportes Agregados: conteos, suma y promedios. */
function runAggregateReports(): void {
  const leadsByCountry: Record<string, number> = countByCategory<Lead, 'country'>(
    LEADS,
    'country',
  );
  const shipmentsByWarehouse: Record<string, number> = countByCategory<
    ShipmentOperation,
    'originWarehouse'
  >(OPERATIONS, 'originWarehouse');

  const totalShippingCost: number = sumByProperty<ShipmentOperation>(
    OPERATIONS,
    'shippingCost',
  );
  const averageWeightKg: number = calculateAverage<ShipmentOperation>(
    OPERATIONS,
    'weightKg',
  );
  const averageShippingCost: number = calculateAverage<ShipmentOperation>(
    OPERATIONS,
    'shippingCost',
  );

  printResult('Generar Reportes Agregados', {
    conteoLeadsPorPais: leadsByCountry,
    conteoEnviosPorAlmacen: shipmentsByWarehouse,
    sumaCostosEnvioEUR: {
      operacion: 'sumByProperty(OPERATIONS, "shippingCost")',
      total: totalShippingCost,
    },
    promedioPesoKg: {
      operacion: 'calculateAverage(OPERATIONS, "weightKg")',
      promedio: Number(averageWeightKg.toFixed(2)),
    },
    promedioCostoEnvioEUR: {
      operacion: 'calculateAverage(OPERATIONS, "shippingCost")',
      promedio: Number(averageShippingCost.toFixed(2)),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Registro de listeners                                               */
/* ------------------------------------------------------------------ */

/** Registra un manejador de clic de forma segura para cada botón. */
function bindButton(buttonId: string, handler: () => void): void {
  const button: HTMLButtonElement | null =
    document.querySelector<HTMLButtonElement>(`#${buttonId}`);
  if (button !== null) {
    button.addEventListener('click', handler);
  }
}

bindButton('btn-filter-us', runFilterLeadsUS);
bindButton('btn-sort-weight', runSortShipmentsByWeight);
bindButton('btn-binary-search', runBinarySearch);
bindButton('btn-aggregate', runAggregateReports);

/* ------------------------------------------------------------------ */
/* Mensaje inicial de la consola                                        */
/* ------------------------------------------------------------------ */

printResult('TrackFlow Data Processing Console', {
  estado: 'Listo',
  instrucciones: 'Selecciona una acción con los botones superiores.',
  datasetsCargados: {
    leads: `${LEADS.length} solicitudes (ModaNorte, ElektraShop, BellezaRosa, TechUS)`,
    envios: `${OPERATIONS.length} operaciones (IDs 101-104)`,
  },
});

// Re-export nominal para mantener viva la referencia del tipo (útil si se
// inspecciona el módulo desde la consola del navegador).
export type { Lead as InteractiveLead, ShipmentOperation as InteractiveShipment } from './types/models';
export { LEADS as MOCK_LEADS, OPERATIONS as MOCK_OPERATIONS };