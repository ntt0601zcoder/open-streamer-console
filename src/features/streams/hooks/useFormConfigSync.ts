import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Keep a form in sync with externally-fetched data without trampling user
 * edits, and without resetting on every poll cycle.
 *
 * Behavior:
 *   - Compares values via JSON hash, so resets only fire when the config the
 *     form covers actually changes — runtime-only refetches (every 4s) are no-ops.
 *   - Skips the reset entirely when the form is dirty, preserving in-progress
 *     edits.
 *
 * Why hash instead of the values object: TanStack Query returns a new object
 * reference on every refetch even when the payload is byte-identical. Using
 * the object as a dep would re-run the effect on every poll and call reset(),
 * which churns useFieldArray IDs and tears down popovers/dropdowns sitting
 * inside the form (Radix Select, DropdownMenu, Combobox, …).
 */
export function useFormConfigSync<T extends FieldValues>(form: UseFormReturn<T>, values: T) {
  const hash = JSON.stringify(values);
  useEffect(() => {
    if (form.formState.isDirty) return;
    form.reset(values);
    // `values` is intentionally read at effect time — `hash` is the canonical
    // change signal; including `values` would refire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);
}
