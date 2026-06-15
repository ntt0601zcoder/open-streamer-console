import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Pencil, ShieldCheck, ShieldOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Policy, Stream } from '@/api/types';
import { useFormConfigSync } from '@/features/streams/hooks/useFormConfigSync';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { useStreamTemplate } from '@/features/streams/hooks/useStreamTemplate';
import { InheritedSectionNotice } from '@/features/streams/components/detail/InheritedSectionNotice';
import {
  RuntimeReadOnlyBanner,
  isRuntimeStream,
} from '@/features/streams/components/detail/RuntimeReadOnlyBanner';
import { usePolicies, usePolicy } from '@/features/policies/hooks/usePolicies';

const NONE = '__none__';

const authSchema = z.object({
  playback_policy: z.string(),
});
type AuthValues = z.infer<typeof authSchema>;

interface AuthTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): AuthValues {
  return { playback_policy: stream.playback_policy ?? '' };
}

export function AuthTab({ stream }: AuthTabProps) {
  const update = useSaveStream();
  const tplState = useStreamTemplate(stream);
  const { data: policies } = usePolicies();

  const initial = toFormValues(tplState.resolved);
  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: initial,
  });
  useFormConfigSync(form, initial);

  const selectedCode = form.watch('playback_policy');
  const { data: selectedPolicy } = usePolicy(selectedCode);

  const readOnly = isRuntimeStream(stream.source);
  const inherited =
    stream.template && !stream.playback_policy && !!tplState.template?.playback_policy;

  function onSubmit(v: AuthValues) {
    if (v.playback_policy === (stream.playback_policy ?? '')) {
      toast.info('No changes to save');
      return;
    }
    update.mutate(
      { code: stream.code, body: { playback_policy: v.playback_policy } },
      {
        onSuccess: () => {
          toast.success('Auth policy updated');
          form.reset(v);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-10">
        {readOnly && <RuntimeReadOnlyBanner />}
        {inherited && stream.template && (
          <InheritedSectionNotice
            templateCode={stream.template}
            label="Auth policy"
            isLoading={tplState.isLoading}
          />
        )}
        <fieldset disabled={readOnly} className="contents space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playback authorisation</CardTitle>
              <CardDescription>
                Bind this stream to a named{' '}
                <Link to="/policies" className="underline">
                  policy
                </Link>{' '}
                to control playback (token requirement + allow/deny chains). Leave empty for public
                playback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="playback_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                      value={field.value ? field.value : NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Public (no policy)</SelectItem>
                        {(policies ?? []).map((p) => (
                          <SelectItem key={p.code} value={p.code}>
                            {p.name ? `${p.name} (${p.code})` : p.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCode && (
                <EffectivePolicyCard
                  code={selectedCode}
                  policy={selectedPolicy ?? null}
                  loading={!selectedPolicy}
                />
              )}
            </CardContent>
          </Card>
        </fieldset>

        {!readOnly && (
          <div className="flex justify-end gap-2 border-t pt-4">
            {form.formState.isDirty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(toFormValues(stream))}
              >
                Discard
              </Button>
            )}
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

function EffectivePolicyCard({
  code,
  policy,
  loading,
}: {
  code: string;
  policy: Policy | null;
  loading: boolean;
}) {
  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Effective rules</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Link to="/policies">
              <Pencil className="h-3 w-3" />
              Edit policies
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {loading && (
          <p className="text-muted-foreground">
            Loading <code>{code}</code>…
          </p>
        )}
        {!loading && policy && (
          <>
            <div className="flex items-center gap-2">
              {policy.require_token ? (
                <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <ShieldCheck className="h-3 w-3" />
                  Token required
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <ShieldOff className="h-3 w-3" />
                  Open (no token)
                </Badge>
              )}
              {policy.description && (
                <span className="text-muted-foreground">{policy.description}</span>
              )}
            </div>
            <RuleList label="Allow IPs" items={policy.allow_ips} />
            <RuleList label="Deny IPs" items={policy.deny_ips} />
            <RuleList label="Allow countries" items={policy.allow_countries} />
            <RuleList label="Deny countries" items={policy.deny_countries} />
            <RuleList label="Allow UAs" items={policy.allow_user_agents} />
            <RuleList label="Deny UAs" items={policy.deny_user_agents} />
            <RuleList label="Allowed Referer domains" items={policy.allowed_domains} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RuleList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="font-mono">{items.join(', ')}</p>
    </div>
  );
}
