import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import type { VODMount } from '@/api/vod';
import { useCreateVodMount, useUpdateVodMount } from '../hooks/useVod';

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9][a-z0-9-_]*$/, 'Use lowercase letters, digits, dashes or underscores'),
  storage: z.string().min(1, 'Storage path is required'),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface VodMountDialogProps {
  mount: VODMount | null;
  onClose: () => void;
}

export function VodMountDialog({ mount, onClose }: VodMountDialogProps) {
  const isEdit = mount !== null;
  const createMount = useCreateVodMount();
  const updateMount = useUpdateVodMount();
  const isPending = createMount.isPending || updateMount.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: mount?.name ?? '',
      storage: mount?.storage ?? '',
      comment: mount?.comment ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    const body = {
      name: values.name,
      storage: values.storage,
      comment: values.comment || undefined,
    };

    if (isEdit) {
      updateMount.mutate(
        { name: mount.name, body },
        {
          onSuccess: () => {
            toast.success('VOD mount updated');
            onClose();
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
        },
      );
    } else {
      createMount.mutate(body, {
        onSuccess: () => {
          toast.success('VOD mount created');
          onClose();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Create failed'),
      });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit VOD mount' : 'New VOD mount'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="vod-main" disabled={isEdit} autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL-safe identifier. Used in{' '}
                    <span className="font-mono">/vod/&lt;name&gt;</span>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage path</FormLabel>
                  <FormControl>
                    <Input placeholder="/var/lib/open-streamer/vod" {...field} />
                  </FormControl>
                  <FormDescription>Absolute directory on the server.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional description"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create mount'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
