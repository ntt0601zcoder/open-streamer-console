import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApi, type GlobalConfig } from '@/api/config';

export const configKeys = {
  all: ['config'] as const,
  yaml: ['config', 'yaml'] as const,
  defaults: ['config', 'defaults'] as const,
} as const;

export function useServerConfig() {
  return useQuery({
    queryKey: configKeys.all,
    queryFn: () => configApi.get(),
  });
}

/** The leading semver core (x.y.z) of a version string, ignoring any `v`
 * prefix or `-suffix` (rc/avsync-test/git-describe). null when absent. */
function semverCore(v: string | undefined | null): string | null {
  if (!v) return null;
  const m = v.match(/\d+\.\d+\.\d+/);
  return m ? m[0] : null;
}

export interface VersionState {
  /** Console version baked at build time (git tag via APP_VERSION, else package.json). */
  client: string;
  /** Server version from /config, or undefined until loaded. */
  server?: string;
  /**
   * True when both expose a comparable semver core and they differ. False
   * while loading or when either side lacks a parseable version — we only
   * warn on a confirmed mismatch, never on uncertainty.
   */
  mismatch: boolean;
}

/**
 * Compare the console's own version against the server version reported by
 * /config. Used to warn operators running a console build that's out of
 * sync with the server (stale tab, half-finished deploy, etc.).
 */
export function useVersionState(): VersionState {
  const { data } = useServerConfig();
  const client = __APP_VERSION__;
  const server = data?.version?.version;
  const clientCore = semverCore(client);
  const serverCore = semverCore(server);
  const mismatch = !!clientCore && !!serverCore && clientCore !== serverCore;
  return { client, server, mismatch };
}

/**
 * Server-side static defaults — fetched once at app init and cached for the
 * lifetime of the tab. Use as form placeholders so users see the real fallback
 * values that the server will substitute for empty fields. The server has to
 * be redeployed to change these, so a tab refresh is enough to pick up new
 * defaults; no polling needed.
 */
export function useConfigDefaults() {
  return useQuery({
    queryKey: configKeys.defaults,
    queryFn: () => configApi.getDefaults(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useUpdateGlobalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GlobalConfig) => configApi.updateGlobal(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

export function useYamlConfig() {
  return useQuery({
    queryKey: configKeys.yaml,
    queryFn: () => configApi.getYaml(),
    staleTime: 0,
    gcTime: 0,
  });
}

export function useUpdateYamlConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (yaml: string) => configApi.updateYaml(yaml),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.all });
      void qc.invalidateQueries({ queryKey: configKeys.yaml });
    },
  });
}

/**
 * Stub probe endpoint during the native libav migration — always returns
 * ok=true with an explanatory notice. Kept so the UI can still surface the
 * notice if anything needs it, but no longer drives a per-binary check.
 */
export function useProbeTranscoder() {
  return useMutation({
    mutationFn: () => configApi.probeTranscoder(),
  });
}
