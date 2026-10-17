/**
 * transformations.ts — Agregaciones, conteos por categoría, sumas,
 * promedios y extremos (min/máx) sobre colecciones.
 */

/**
 * Comparación genérica de valores para localizar extremos.
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
 * Cuenta cuántos elementos de la colección comparten cada valor de `key`.
 *
 * @param collection Colección a analizar.
 * @param key Propiedad por la que categorizar.
 * @returns Objeto con los conteos por categoría.
 */
export function countByCategory<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
): Record<string, number> {
  return collection.reduce<Record<string, number>>((counts, item) => {
    const category = String(item[key]);
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

/**
 * Suma los valores numéricos de la propiedad `key`.
 * Los valores no numéricos se ignoran (se tratan como 0).
 *
 * @param collection Colección a analizar.
 * @param key Propiedad numérica a sumar.
 * @returns Suma total.
 */
export function sumByProperty<T>(collection: readonly T[], key: keyof T): number {
  return collection.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);
}

/**
 * Calcula el promedio aritmético de la propiedad `key`.
 *
 * @param collection Colección a analizar.
 * @param key Propiedad numérica a promediar.
 * @returns Promedio (0 si la colección está vacía).
 */
export function calculateAverage<T>(collection: readonly T[], key: keyof T): number {
  if (collection.length === 0) {
    return 0;
  }
  return sumByProperty(collection, key) / collection.length;
}

/**
 * Localiza el elemento con el valor mínimo y el elemento con el valor
 * máximo de la propiedad `key`.
 *
 * @param collection Colección a analizar.
 * @param key Propiedad sobre la que hallar los extremos.
 * @returns Objeto con `min` y `max` (ambos `null` si la colección está vacía).
 */
export function findMinMax<T>(
  collection: readonly T[],
  key: keyof T,
): { min: T | null; max: T | null } {
  if (collection.length === 0) {
    return { min: null, max: null };
  }

  let minItem: T = collection[0];
  let maxItem: T = collection[0];

  for (const item of collection) {
    if (compareValues(item[key], minItem[key]) < 0) {
      minItem = item;
    }
    if (compareValues(item[key], maxItem[key]) > 0) {
      maxItem = item;
    }
  }

  return { min: minItem, max: maxItem };
}