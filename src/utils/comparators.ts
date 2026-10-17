/**
 * comparators.ts — Comparación genérica de valores (fuente única de verdad).
 * --------------------------------------------------------------------------
 * Compartida por `collections.ts`, `search.ts` y `transformations.ts` para
 * evitar duplicar la lógica de comparación (principio DRY).
 */

/**
 * Compara dos valores arbitrarios y devuelve un número con signo:
 * - `< 0` si `a` precede a `b`.
 * - `> 0` si `a` sigue a `b`.
 * - `0` si son equivalentes.
 *
 * Reglas de comparación:
 * - strings: comparación lexicográfica.
 * - numbers: resta numérica.
 * - booleanos / otros: false (0) < true (1).
 */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return Number(Boolean(a)) - Number(Boolean(b));
}