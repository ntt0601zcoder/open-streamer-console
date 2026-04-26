import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApi, type GlobalConfig, type ProbeRequest } from '@/api/config';

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
 * Probe an FFmpeg binary for app compatibility. One-shot mutation — caller
 * owns the result; nothing is cached or invalidated.
 */
export function useProbeTranscoder() {
  return useMutation({
    mutationFn: (body: ProbeRequest) => configApi.probeTranscoder(body),
  });
}
