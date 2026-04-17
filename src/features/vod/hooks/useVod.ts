import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vodApi, type VODMountBody } from '@/api/vod';

export const vodKeys = {
  all: ['vod'] as const,
  mount: (name: string) => ['vod', name] as const,
  files: (name: string, path: string) => ['vod', name, 'files', path] as const,
} as const;

export function useVodMounts() {
  return useQuery({
    queryKey: vodKeys.all,
    queryFn: async () => {
      const res = await vodApi.list();
      return res.data;
    },
  });
}

export function useVodMount(name: string | undefined) {
  return useQuery({
    queryKey: vodKeys.mount(name ?? ''),
    queryFn: async () => {
      const res = await vodApi.get(name!);
      return res.data;
    },
    enabled: !!name,
  });
}

export function useCreateVodMount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VODMountBody) => vodApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vodKeys.all });
    },
  });
}

export function useUpdateVodMount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: VODMountBody }) => vodApi.update(name, body),
    onSuccess: (res, { name }) => {
      qc.setQueryData(vodKeys.mount(name), res.data);
      void qc.invalidateQueries({ queryKey: vodKeys.all });
    },
  });
}

export function useDeleteVodMount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => vodApi.delete(name),
    onSuccess: (_res, name) => {
      qc.removeQueries({ queryKey: vodKeys.mount(name) });
      void qc.invalidateQueries({ queryKey: vodKeys.all });
    },
  });
}

export function useVodFiles(name: string | undefined, path: string) {
  return useQuery({
    queryKey: vodKeys.files(name ?? '', path),
    queryFn: () => vodApi.listFiles(name!, path),
    enabled: !!name,
  });
}

export function useUploadVodFile(name: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) =>
      vodApi.uploadFile(name, file, path),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vod', name, 'files'] });
    },
  });
}

export function useDeleteVodFile(name: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => vodApi.deleteFile(name, path),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vod', name, 'files'] });
    },
  });
}
