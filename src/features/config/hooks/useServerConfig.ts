import { useQuery } from '@tanstack/react-query';
import { configApi } from '@/api/config';

export const configKeys = {
  all: ['config'] as const,
} as const;

export function useServerConfig() {
  return useQuery({
    queryKey: configKeys.all,
    queryFn: () => configApi.get(),
    staleTime: Infinity, // server config doesn't change at runtime
    gcTime: Infinity,
  });
}
