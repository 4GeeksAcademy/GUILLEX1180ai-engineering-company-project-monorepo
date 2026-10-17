/**
 * collections.ts — Filtrado por criterios y ordenamiento de colecciones.
 * ------------------------------------------------------------
 * Funciones puras y genéricas reutilizables sobre cualquier array
 * de objetos tipado (Lead, ShipmentOperation, etc.).
 */

/**
 * Devuelve una nueva colección con los elementos cuyo valor en `key`
 * es estrictamente igual a `value`.
 *
 * @param collection Colección de origen (sin mutar).
 * @param key Propiedad sobre la que filtrar.
 * @param value Valor exacto que deben cumplir los elementos.
 * @returns Arreglo nuevo con los elementos que coinciden.
 */
export function filterByProperty<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
  value: T[K],
): T[] {
  return collection.filter((item) => item[key] === value);
}

/**
 * Devuelve una nueva colección con los elementos que cumplen TODOS
 * los criterios proporcionados (AND lógico).
 *
 * @param collection Colección de origen (sin mutar).
 * @param criteria Objeto parcial con los pares propiedad/valor a exigir.
 * @returns Arreglo nuevo con los elementos que cumplen todos los criterios.
 */
export function filterByCriteria<T>(
  collection: readonly T[],
  criteria: Partial<Record<keyof T, unknown>>,
): T[] {
  return collection.filter((item) =>
    Object.entries(criteria).every(([key, value]) => item[key as keyof T] === value),
  );
}

/**
 * Devuelve una copia de la colección ordenada ascendentemente o
 * descendentemente por la propiedad `key` indicada.
 *
 * @param collection Colección de origen (sin mutar).
 * @param key Propiedad de ordenación.
 * @param order 'asc' (por defecto) u 'desc'.
 * @returns Arreglo nuevo ordenado.
 */
export function sortByProperty<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
  order: 'asc' | 'desc' = 'asc',
): T[] {
  const direction = order === 'asc' ? 1 : -1;

  return [...collection].sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return valueA.localeCompare(valueB) * direction;
    }
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return (valueA - valueB) * direction;
    }

    // Booleanos y valores mixtos: false < true.
    const normalizedA = valueA ? 1 : 0;
    const normalizedB = valueB ? 1 : 0;
    return (normalizedA - normalizedB) * direction;
  });
}

/**
 * Agrupa los elementos de la colección por el valor de la propiedad `key`,
 * devolviendo un objeto cuyas claves son los valores agrupados.
 *
 * @param collection Colección de origen (sin mutar).
 * @param key Propiedad por la que agrupar.
 * @returns Objeto Record<string, T[]> agrupado por valor.
 */
export function groupByProperty<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
): Record<string, T[]> {
  return collection.reduce<Record<string, T[]>>((groups, item) => {
    const groupKey = String(item[key]);
    (groups[groupKey] ??= []).push(item);
    return groups;
  }, {});
}