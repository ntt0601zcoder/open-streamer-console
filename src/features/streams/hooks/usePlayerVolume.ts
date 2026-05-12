import { useCallback, useState, type RefObject } from 'react';

const DEFAULT_VOLUME = 0.5;

interface Options {
  /** Start the player muted (e.g. grid view with many concurrent players). */
  defaultMuted?: boolean;
  /**
   * When set, the muted flag is driven by the parent (e.g. grid view's hover
   * behaviour). Internal toggle/setMuted calls still update local state but
   * the returned `muted` and the value applied to `<video>` always reflect
   * this prop until it's removed.
   */
  controlledMuted?: boolean;
}

/**
 * Volume / muted state for a `<video>` element.
 *
 * Always defaults to 50% unmuted when the player mounts — the operator gets
 * a predictable starting point per session, no surprise loud audio from a
 * previous tab. Adjustments stay in-memory only; reload resets.
 *
 * Apply the state to the element via the returned `apply(video)` helper —
 * call it after the player attaches its source. Browsers block unmuted
 * autoplay; the caller's autoplay logic should already attempt muted-fallback
 * when `play()` rejects.
 */
export function usePlayerVolume(opts: Options = {}) {
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);
  const [internalMuted, setMutedState] = useState<boolean>(opts.defaultMuted ?? false);
  const muted = opts.controlledMuted ?? internalMuted;

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    // Adjusting the slider implicitly unmutes (otherwise the change is silent
    // and confusing) — but moving to 0 is interpreted as a mute intent.
    setMutedState(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => !m);
  }, []);

  /** Force the muted flag (e.g. autoplay-blocked fallback). */
  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
  }, []);

  /** Apply current state to the element. Idempotent — safe to call repeatedly. */
  const apply = useCallback(
    (videoRef: RefObject<HTMLVideoElement | null>) => {
      const v = videoRef.current;
      if (!v) return;
      v.volume = volume;
      v.muted = muted;
    },
    [volume, muted],
  );

  return { volume, muted, setVolume, setMuted, toggleMute, apply };
}
