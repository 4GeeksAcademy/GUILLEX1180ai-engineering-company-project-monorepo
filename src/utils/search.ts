/**
 * search.ts — Búsqueda lineal (O(n)) y binaria (O(log n)).
 * --------------------------------------------------------------------
 * - `linearSearch`: para arrays sin orden previo, O(n).
 * - `binarySearch`: para arrays previamente ordenados por `key`, O(log n).
 *   Devuelve `null` explícito si el elemento no se encuentra.
 */

import { compareValues } from './comparators';

/** Busca linealmente el primer elemento que cumple el predicado. */
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

/** Busca binariamente un elemento en una colección ordenada ascendentemente por `key`. */
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