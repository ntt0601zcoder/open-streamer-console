import { useQuery } from '@tanstack/react-query';
import { recordingsApi } from '@/api/recordings';

export const recordingInfoKeys = {
  detail: (code: string) => ['recordings', code, 'info'] as const,
};

export function useRecordingInfo(code: string, enabled: boolean) {
  return useQuery({
    queryKey: recordingInfoKeys.detail(code),
    queryFn: () => recordingsApi.info(code).then((res) => res.data),
    enabled,
    refetchInterval: 4000,
    retry: false,
  });
}
