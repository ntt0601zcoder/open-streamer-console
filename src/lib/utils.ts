import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Build a partial update body by comparing updated values against the original.
 * Only fields with changed values are included in the result.
 */
export function buildPatch<T extends object>(original: T, updated: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(updated).filter(([k, v]) => v !== original[k as keyof T]),
  ) as Partial<T>;
}
