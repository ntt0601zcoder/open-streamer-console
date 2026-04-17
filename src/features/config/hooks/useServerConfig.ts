import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApi, type GlobalConfig } from '@/api/config';

export const configKeys = {
  all: ['config'] as const,
  yaml: ['config', 'yaml'] as const,
} as const;

export function useServerConfig() {
  return useQuery({
    queryKey: configKeys.all,
    queryFn: () => configApi.get(),
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
