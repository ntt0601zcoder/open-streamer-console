import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { streamsApi } from '@/api/streams';
import type { StreamBody } from '@/api/types';

export const streamKeys = {
  all: ['streams'] as const,
  detail: (code: string) => ['streams', code] as const,
  recordings: (code: string) => ['streams', code, 'recordings'] as const,
} as const;

export function useStreams() {
  return useQuery({
    queryKey: streamKeys.all,
    queryFn: async () => {
      const res = await streamsApi.list();
      return res.data;
    },
    refetchInterval: 4_000,
  });
}

export function useStream(code: string) {
  return useQuery({
    queryKey: streamKeys.detail(code),
    queryFn: async () => {
      const res = await streamsApi.get(code);
      return res.data;
    },
    refetchInterval: 4_000,
  });
}

export function useStreamRecordings(code: string) {
  return useQuery({
    queryKey: streamKeys.recordings(code),
    queryFn: async () => {
      const res = await streamsApi.getRecordings(code);
      return res.data;
    },
  });
}

export function useSaveStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: StreamBody }) => streamsApi.save(code, body),
    onSuccess: (res, { code }) => {
      qc.setQueryData(streamKeys.detail(code), res.data);
      void qc.invalidateQueries({ queryKey: streamKeys.all });
    },
  });
}

export function useDeleteStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => streamsApi.delete(code),
    onSuccess: (_res, code) => {
      qc.removeQueries({ queryKey: streamKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: streamKeys.all });
    },
  });
}

export function useRestartStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => streamsApi.restart(code),
    onSuccess: (_res, code) => {
      void qc.invalidateQueries({ queryKey: streamKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: streamKeys.all });
    },
  });
}

export function useStartRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => streamsApi.startRecording(code),
    onSuccess: (_res, code) => {
      void qc.invalidateQueries({ queryKey: streamKeys.recordings(code) });
    },
  });
}

export function useStopRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => streamsApi.stopRecording(code),
    onSuccess: (_res, code) => {
      void qc.invalidateQueries({ queryKey: streamKeys.recordings(code) });
    },
  });
}

export function useSwitchInput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, priority }: { code: string; priority: number }) =>
      streamsApi.switchInput(code, priority),
    onSuccess: (_res, { code }) => {
      void qc.invalidateQueries({ queryKey: streamKeys.detail(code) });
    },
  });
}
