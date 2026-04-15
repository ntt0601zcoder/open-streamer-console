import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordingsApi } from '@/api/recordings';

export const recordingKeys = {
  all: ['recordings'] as const,
  detail: (rid: string) => ['recordings', rid] as const,
} as const;

export function useRecording(rid: string) {
  return useQuery({
    queryKey: recordingKeys.detail(rid),
    queryFn: async () => {
      const res = await recordingsApi.get(rid);
      return res.data;
    },
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rid: string) => recordingsApi.delete(rid),
    onSuccess: (_res, rid) => {
      qc.removeQueries({ queryKey: recordingKeys.detail(rid) });
      void qc.invalidateQueries({ queryKey: recordingKeys.all });
    },
  });
}
