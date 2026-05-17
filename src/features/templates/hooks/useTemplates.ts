import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '@/api/templates';
import type { TemplateBody } from '@/api/types';

export const templateKeys = {
  all: ['templates'] as const,
  detail: (code: string) => ['templates', code] as const,
} as const;

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: async () => {
      const res = await templatesApi.list();
      return res.data;
    },
  });
}

export function useTemplate(code: string) {
  return useQuery({
    queryKey: templateKeys.detail(code),
    queryFn: async () => {
      const res = await templatesApi.get(code);
      return res.data;
    },
    enabled: !!code,
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: TemplateBody }) =>
      templatesApi.save(code, body),
    onSuccess: (res, { code }) => {
      qc.setQueryData(templateKeys.detail(code), res.data);
      void qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => templatesApi.delete(code),
    onSuccess: (_res, code) => {
      qc.removeQueries({ queryKey: templateKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
