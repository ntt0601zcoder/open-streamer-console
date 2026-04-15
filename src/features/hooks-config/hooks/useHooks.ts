import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hooksApi } from '@/api/hooks';
import type { CreateHookBody, UpdateHookBody } from '@/api/types';

export const hookKeys = {
  all: ['hooks'] as const,
  detail: (hid: string) => ['hooks', hid] as const,
} as const;

export function useHooks() {
  return useQuery({
    queryKey: hookKeys.all,
    queryFn: async () => {
      const res = await hooksApi.list();
      return res.data;
    },
  });
}

export function useHook(hid: string) {
  return useQuery({
    queryKey: hookKeys.detail(hid),
    queryFn: async () => {
      const res = await hooksApi.get(hid);
      return res.data;
    },
  });
}

export function useCreateHook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHookBody) => hooksApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hookKeys.all });
    },
  });
}

export function useUpdateHook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ hid, patch }: { hid: string; patch: UpdateHookBody }) =>
      hooksApi.update(hid, patch),
    onSuccess: (res, { hid }) => {
      qc.setQueryData(hookKeys.detail(hid), res.data);
      void qc.invalidateQueries({ queryKey: hookKeys.all });
    },
  });
}

export function useDeleteHook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hid: string) => hooksApi.delete(hid),
    onSuccess: (_res, hid) => {
      qc.removeQueries({ queryKey: hookKeys.detail(hid) });
      void qc.invalidateQueries({ queryKey: hookKeys.all });
    },
  });
}

export function useTestHook() {
  return useMutation({
    mutationFn: (hid: string) => hooksApi.test(hid),
  });
}
