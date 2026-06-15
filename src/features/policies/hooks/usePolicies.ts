import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '@/api/policies';
import type { Policy, PolicyBody } from '@/api/types';

export const policyKeys = {
  all: ['policies'] as const,
  detail: (code: string) => ['policies', code] as const,
};

export function usePolicies() {
  return useQuery({
    queryKey: policyKeys.all,
    queryFn: async () => (await policiesApi.list()).data,
  });
}

export function usePolicy(code: string) {
  return useQuery({
    queryKey: policyKeys.detail(code),
    queryFn: async () => (await policiesApi.get(code)).data,
    enabled: !!code,
  });
}

export function useSavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: PolicyBody }) =>
      policiesApi.save(code, body),
    onSuccess: (res, vars) => {
      const updated = res.data;
      qc.setQueryData<Policy>(policyKeys.detail(vars.code), updated);
      void qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => policiesApi.delete(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}
