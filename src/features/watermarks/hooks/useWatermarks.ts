import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { watermarksApi, type UploadWatermarkInput } from '@/api/watermarks';

export const watermarkKeys = {
  all: ['watermarks'] as const,
  detail: (id: string) => ['watermarks', id] as const,
};

export function useWatermarkAssets() {
  return useQuery({
    queryKey: watermarkKeys.all,
    queryFn: async () => {
      const res = await watermarksApi.list();
      return res.data;
    },
  });
}

export function useUploadWatermark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadWatermarkInput) => watermarksApi.upload(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watermarkKeys.all });
    },
  });
}

export function useDeleteWatermark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => watermarksApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watermarkKeys.all });
    },
  });
}
