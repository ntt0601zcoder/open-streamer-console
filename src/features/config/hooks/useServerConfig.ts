import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApi, type GlobalConfig } from '@/api/config';

export const configKeys = {
  all: ['config'] as const,
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
