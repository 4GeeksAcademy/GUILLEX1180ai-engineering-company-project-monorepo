/**
 * collections.ts — Filtrado, ordenamiento y agrupación de colecciones.
 * --------------------------------------------------------------------
 * Funciones puras y genéricas reutilizables sobre arrays de objetos
 * tipados (Lead, ShipmentOperation, etc.).
 */

import { compareValues } from './comparators';

/** Devuelve una nueva colección con los elementos cuyo valor en `key` es igual a `value`. */
export function filterByProperty<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
  value: T[K],
): T[] {
  return collection.filter((item) => item[key] === value);
}

/** Devuelve una nueva colección con los elementos que cumplen todos los criterios (AND lógico). */
export function filterByCriteria<T>(
  collection: readonly T[],
  criteria: Partial<Record<keyof T, unknown>>,
): T[] {
  return collection.filter((item) =>
    Object.entries(criteria).every(([key, value]) => item[key as keyof T] === value),
  );
}

/** Devuelve una copia de la colección ordenada por `key`, ascendente (por defecto) o descendente. */
export function sortByProperty<T, K extends keyof T>(
  collection: readonly T[],
  key: K,
  order: 'asc' | 'desc' = 'asc',
): T[] {
  const direction = order === 'asc' ? 1 : -1;

  return [...collection].sort((a, b) => compareValues(a[key], b[key]) * direction);
}

/** Agrupa los elementos por el valor de `key` y devuelve un objeto con los grupos. */
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