/* eslint-disable react-refresh/only-export-components */
import { Zap } from 'lucide-react';

/**
 * Slim banner shown at the top of each editable tab on a stream-detail page
 * when the stream is a runtime (auto-publish) record. Runtime streams have
 * no on-disk config — the server materialises them on the fly from a
 * template prefix match, so save endpoints reject mutations. The UI hides
 * the Save button and surfaces this notice so operators don't waste effort.
 */
export function RuntimeReadOnlyBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-0.5">
        <p className="font-medium text-amber-700 dark:text-amber-300">Runtime stream (read-only)</p>
        <p className="text-xs text-muted-foreground">
          This stream was materialised on the fly by auto-publish from a template prefix match. It
          has no persisted config and cannot be edited here — change the template instead, or stop
          the runtime stream and create a config-backed one with the same code.
        </p>
      </div>
    </div>
  );
}

/** Utility — keep tabs symmetrical. */
export function isRuntimeStream(source: string | undefined): boolean {
  return source === 'runtime';
}
