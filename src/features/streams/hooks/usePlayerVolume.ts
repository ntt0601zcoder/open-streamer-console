import { useCallback, useEffect, useState, type RefObject } from 'react';

const VOLUME_KEY = 'osc.player.volume';
const MUTED_KEY = 'osc.player.muted';

const DEFAULT_VOLUME = 0.5;

function readVolume(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
  const raw = localStorage.getItem(VOLUME_KEY);
  if (raw == null) return DEFAULT_VOLUME;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : DEFAULT_VOLUME;
}

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(MUTED_KEY) === '1';
}

/**
 * Centralised volume / muted state for a `<video>` element.
 *
 * - Defaults to unmuted at full volume so the operator hears audio out of the
 *   box; persists user adjustments to localStorage so it sticks across tabs.
 * - Apply the state to the element via the returned `apply(video)` helper —
 *   call it after the player attaches its source. Browsers block unmuted
 *   autoplay; the caller's autoplay logic should already attempt muted-fallback
 *   when `play()` rejects.
 */
export function usePlayerVolume() {
  const [volume, setVolumeState] = useState<number>(() => readVolume());
  const [muted, setMutedState] = useState<boolean>(() => readMuted());

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOLUME_KEY, String(volume));
    }
  }, [volume]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
    }
  }, [muted]);

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
