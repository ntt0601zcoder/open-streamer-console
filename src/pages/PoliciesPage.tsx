import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Policy } from '@/api/types';
import { useDeletePolicy, usePolicies, useSavePolicy } from '@/features/policies/hooks/usePolicies';

const policySchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[a-z0-9][a-z0-9-_]*$/, 'Lowercase letters, numbers, hyphens, underscores only'),
  name: z.string(),
  description: z.string(),
  require_token: z.boolean(),
  token_secret: z.string(),
  allow_ips: z.string(),
  deny_ips: z.string(),
  allow_countries: z.string(),
  deny_countries: z.string(),
  allow_user_agents: z.string(),
  deny_user_agents: z.string(),
  allowed_domains: z.string(),
});
type PolicyFormValues = z.infer<typeof policySchema>;

const EMPTY: PolicyFormValues = {
  code: '',
  name: '',
  description: '',
  require_token: false,
  token_secret: '',
  allow_ips: '',
  deny_ips: '',
  allow_countries: '',
  deny_countries: '',
  allow_user_agents: '',
  deny_user_agents: '',
  allowed_domains: '',
};

function toLines(arr?: string[]): string {
  return arr?.join('\n') ?? '';
}
function fromLines(s: string): string[] | undefined {
  if (!s.trim()) return undefined;
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
function fromPolicy(p: Policy): PolicyFormValues {
  return {
    code: p.code,
    name: p.name ?? '',
    description: p.description ?? '',
    require_token: p.require_token ?? false,
    token_secret: p.token_secret ?? '',
    allow_ips: toLines(p.allow_ips),
    deny_ips: toLines(p.deny_ips),
    allow_countries: toLines(p.allow_countries),
    deny_countries: toLines(p.deny_countries),
    allow_user_agents: toLines(p.allow_user_agents),
    deny_user_agents: toLines(p.deny_user_agents),
    allowed_domains: toLines(p.allowed_domains),
  };
}

export function PoliciesPage() {
  const { data: policies, isLoading } = usePolicies();
  const [editing, setEditing] = useState<Policy | null | 'new'>(null);
  const del = useDeletePolicy();

  function handleDelete(code: string) {
    if (!confirm(`Delete policy "${code}"?`)) return;
    del.mutate(code, {
      onSuccess: () => toast.success(`Policy "${code}" deleted`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Playback policies</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Named media-auth rule sets streams can reference via <code>playback_policy</code>.
          </p>
        </div>
        <Button onClick={() => setEditing('new')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All policies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (!policies || policies.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No policies yet. Create one to gate playback.
            </p>
          )}
          {policies && policies.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="w-[100px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <PolicyRow
                    key={p.code}
                    policy={p}
                    onEdit={() => setEditing(p)}
                    onDelete={() => handleDelete(p.code)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing != null && (
        <PolicyEditorDialog
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PolicyRow({
  policy,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ruleCount =
    (policy.allow_ips?.length ?? 0) +
    (policy.deny_ips?.length ?? 0) +
    (policy.allow_countries?.length ?? 0) +
    (policy.deny_countries?.length ?? 0) +
    (policy.allow_user_agents?.length ?? 0) +
    (policy.deny_user_agents?.length ?? 0) +
    (policy.allowed_domains?.length ?? 0);

  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs">{policy.code}</TableCell>
      <TableCell className="align-top">
        <p className="text-sm">{policy.name || <span className="text-muted-foreground">—</span>}</p>
        {policy.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{policy.description}</p>
        )}
      </TableCell>
      <TableCell className="align-top">
        {policy.require_token ? (
          <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
            <ShieldCheck className="h-3 w-3" />
            required
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <ShieldOff className="h-3 w-3" />
            open
          </Badge>
        )}
      </TableCell>
      <TableCell className="align-top text-xs text-muted-foreground">
        {ruleCount > 0 ? `${ruleCount} rule${ruleCount === 1 ? '' : 's'}` : '—'}
      </TableCell>
      <TableCell className="align-top text-right">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function PolicyEditorDialog({ initial, onClose }: { initial: Policy | null; onClose: () => void }) {
  const save = useSavePolicy();
  const isCreate = initial == null;

  const defaults = useMemo<PolicyFormValues>(
    () => (initial ? fromPolicy(initial) : EMPTY),
    [initial],
  );

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const requireToken = form.watch('require_token');

  function onSubmit(v: PolicyFormValues) {
    save.mutate(
      {
        code: v.code,
        body: {
          name: v.name || undefined,
          description: v.description || undefined,
          require_token: v.require_token,
          token_secret: v.token_secret || undefined,
          allow_ips: fromLines(v.allow_ips),
          deny_ips: fromLines(v.deny_ips),
          allow_countries: fromLines(v.allow_countries),
          deny_countries: fromLines(v.deny_countries),
          allow_user_agents: fromLines(v.allow_user_agents),
          deny_user_agents: fromLines(v.deny_user_agents),
          allowed_domains: fromLines(v.allowed_domains),
        },
      },
      {
        onSuccess: () => {
          toast.success(isCreate ? 'Policy created' : 'Policy updated');
          onClose();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'New policy' : `Edit ${initial?.code}`}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="paid-only"
                        className="font-mono"
                        {...field}
                        disabled={!isCreate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Paid subscribers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="require_token"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Require signed playback token</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="token_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token secret</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      className="font-mono"
                      autoComplete="off"
                      placeholder="HMAC-SHA256 key"
                      {...field}
                      disabled={!requireToken}
                    />
                  </FormControl>
                  <FormDescription>Required when token is required.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="allow_ips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allow IPs / CIDRs</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={'10.0.0.0/8\n192.168.1.42'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deny_ips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deny IPs / CIDRs</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={'203.0.113.0/24'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allow_countries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allow countries</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder={'VN\nUS'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deny_countries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deny countries</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allow_user_agents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allow User-Agents</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder={'Mozilla\nOurApp/'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deny_user_agents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deny User-Agents</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowed_domains"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Allowed Referer domains</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder={'example.com\n*.partner.tld'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : isCreate ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
