/**
 * search.ts — Búsqueda lineal y búsqueda binaria sobre colecciones.
 * ------------------------------------------------------------
 * - `linearSearch`: para arrays sin orden previo, O(n).
 * - `binarySearch`: para arrays previamente ordenados por `key`, O(log n).
 */

/**
 * Comparación genérica para valores de una propiedad.
 * - strings: comparación lexicográfica.
 * - numbers: resta numérica.
 * - booleanos / otros: false (0) < true (1).
 */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return Number(Boolean(a)) - Number(Boolean(b));
}

/**
 * Busca linealmente (O(n)) el primer elemento que cumpla el predicado.
 * Adecuado para colecciones desordenadas.
 *
 * @param collection Colección a recorrer.
 * @param predicate Función de prueba por elemento.
 * @returns El primer elemento que cumple el predicado o `null` si no existe.
 */
export function linearSearch<T>(
  collection: readonly T[],
  predicate: (item: T) => boolean,
): T | null {
  for (const item of collection) {
    if (predicate(item)) {
      return item;
    }
  }
  return null;
}

/**
 * Busca binariamente (O(log n)) un elemento en una colección que YA está
 * ordenada de forma ascendente por la propiedad `key`.
 *
 * @param sortedCollection Colección ordenada ascendentemente por `key`.
 * @param key Propiedad por la que la colección está ordenada.
 * @param targetValue Valor buscado de la propiedad `key`.
 * @returns El elemento encontrado o `null` si no existe.
 */
export function binarySearch<T, K extends keyof T>(
  sortedCollection: readonly T[],
  key: K,
  targetValue: T[K],
): T | null {
  let low = 0;
  let high = sortedCollection.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentValue = sortedCollection[mid][key];

    if (currentValue === targetValue) {
      return sortedCollection[mid];
    }

    if (compareValues(currentValue, targetValue) < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return null;
}