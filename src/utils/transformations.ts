/**
 * transformations.ts — Agregaciones, conteos, sumas, promedios y extremos.
 * ------------------------------------------------------------------------
 * Todas las funciones tratan colecciones vacías de forma explícita:
 * sumas = 0, promedios = 0 (evita NaN) y extremos = { min: null, max: null }.
 */

import { compareValues } from './comparators';

/** Cuenta cuántos elementos comparten cada valor de `key`. */
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

/** Suma los valores numéricos de `key` (los no numéricos se tratan como 0). */
export function sumByProperty<T>(collection: readonly T[], key: keyof T): number {
  return collection.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);
}

/** Promedio aritmético de `key`; devuelve 0 si la colección está vacía (evita NaN). */
export function calculateAverage<T>(collection: readonly T[], key: keyof T): number {
  if (collection.length === 0) {
    return 0;
  }
  return sumByProperty(collection, key) / collection.length;
}

/** Localiza el elemento con el valor mínimo y el máximo de `key`. */
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