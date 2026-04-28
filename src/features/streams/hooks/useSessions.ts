import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, type SessionListOptions } from '@/api/sessions';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (opts: SessionListOptions) => ['sessions', 'list', opts] as const,
  forStream: (code: string, opts: SessionListOptions) =>
    ['sessions', 'stream', code, opts] as const,
};

/** Global session list — used by the operator-wide Sessions view (if any). */
export function useSessions(opts: SessionListOptions = {}) {
  return useQuery({
    queryKey: sessionKeys.list(opts),
    queryFn: () => sessionsApi.list(opts),
    refetchInterval: 5_000,
  });
}

/** Sessions filtered to one stream — used by the stream detail Sessions tab. */
export function useStreamSessions(code: string, opts: SessionListOptions = {}) {
  return useQuery({
    queryKey: sessionKeys.forStream(code, opts),
    queryFn: () => sessionsApi.listForStream(code, opts),
    refetchInterval: 5_000,
  });
}

/** Force-close a session. Invalidates every cached session list on success. */
export function useKickSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.kick(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
