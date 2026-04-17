import { useEffect, useMemo, useState } from 'react';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { AlertCircle, Download, RotateCcw, Save, Sparkles, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { APIError } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  useUpdateYamlConfig,
  useYamlConfig,
} from '@/features/config/hooks/useServerConfig';

interface ApiErrorView {
  title: string;
  message: string;
  code?: string;
  fields?: { path: string; message: string }[];
}

export function ConfigEditorPage() {
  const { resolvedTheme } = useTheme();
  const { data, isLoading, error: loadError, refetch } = useYamlConfig();
  const update = useUpdateYamlConfig();

  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<ApiErrorView | null>(null);

  useEffect(() => {
    if (data !== undefined) setText(data);
  }, [data]);

  const isDirty = data !== undefined && text !== data;

  const extensions = useMemo(() => [yamlLang()], []);
  const editorTheme = resolvedTheme === 'dark' ? oneDark : 'light';

  function validate(value: string): string | null {
    if (!value.trim()) return 'YAML is empty';
    try {
      parseYaml(value);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid YAML';
    }
  }

  function handleFormat() {
    const err = validate(text);
    if (err) {
      setParseError(err);
      toast.error('Cannot format — fix YAML errors first');
      return;
    }
    try {
      const obj = parseYaml(text);
      const formatted = stringifyYaml(obj, { indent: 2, lineWidth: 0 });
      setText(formatted);
      setParseError(null);
      toast.success('Formatted');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Format failed');
    }
  }

  function handleDiscard() {
    if (data !== undefined) {
      setText(data);
      setParseError(null);
      setSaveError(null);
    }
  }

  async function handleReload() {
    setParseError(null);
    setSaveError(null);
    await refetch();
    toast.success('Reloaded from server');
  }

  function handleSave() {
    const err = validate(text);
    if (err) {
      setParseError(err);
      toast.error('Cannot save — fix YAML errors first');
      return;
    }
    setSaveError(null);
    update.mutate(text, {
      onSuccess: () => toast.success('Configuration applied'),
      onError: (err) => {
        setSaveError(parseApiError(err, 'Server rejected configuration'));
        toast.error('Save failed');
      },
    });
  }

  function handleDownload() {
    const blob = new Blob([text], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-streamer-config-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      setText(value);
      setParseError(validate(value));
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Config editor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the full system configuration (global, streams, hooks) as a single YAML document.
            Changes are applied immediately on save.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">Form view</Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border rounded-md p-2 bg-muted/30">
        <Button
          size="sm"
          variant="outline"
          onClick={handleFormat}
          disabled={!text || isLoading}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Format
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReload}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reload
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          disabled={!text}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
        <label className="inline-flex">
          <input
            type="file"
            accept=".yaml,.yml,application/yaml,text/yaml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="outline" asChild className="gap-1.5 cursor-pointer">
            <span>
              <Upload className="h-3.5 w-3.5" />
              Upload
            </span>
          </Button>
        </label>

        <div className="ml-auto flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {isDirty && (
            <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={update.isPending}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || update.isPending || !!parseError}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {loadError && (
        <ApiErrorBanner error={parseApiError(loadError, 'Failed to load configuration')} />
      )}
      {parseError && (
        <ApiErrorBanner error={{ title: 'YAML parse error', message: parseError }} />
      )}
      {saveError && <ApiErrorBanner error={saveError} />}

      {/* Editor */}
      <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Loading configuration…
          </div>
        ) : (
          <CodeMirror
            value={text}
            theme={editorTheme}
            extensions={extensions}
            onChange={(value) => {
              setText(value);
              setParseError(null);
              setSaveError(null);
            }}
            height="100%"
            className="h-full text-sm"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              bracketMatching: true,
              indentOnInput: true,
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}

function ApiErrorBanner({ error }: { error: ApiErrorView }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive max-h-64 overflow-auto">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{error.title}</p>
          {error.code && (
            <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">
              {error.code}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs opacity-90">{error.message}</p>
        {error.fields && error.fields.length > 0 && (
          <ul className="mt-2 space-y-1">
            {error.fields.map((f, i) => (
              <li
                key={`${f.path}-${i}`}
                className="flex flex-col gap-0.5 rounded border border-destructive/20 bg-background/40 px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <code className="shrink-0 font-mono text-xs text-destructive">{f.path}</code>
                <span className="text-xs text-foreground/80">{f.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: { path: string; message: string }[];
    details?: unknown;
  };
  errors?: unknown[];
}

function parseApiError(err: unknown, fallbackTitle: string): ApiErrorView {
  if (err instanceof APIError) {
    const body = (err.body ?? {}) as ApiErrorBody;
    const e = body.error;
    if (e) {
      const fields = Array.isArray(e.fields)
        ? e.fields.filter(
            (f): f is { path: string; message: string } =>
              !!f && typeof f === 'object' && 'path' in f && 'message' in f,
          )
        : undefined;
      let message = e.message ?? `HTTP ${err.status}`;
      if (!fields && e.details !== undefined) {
        message = `${message}\n${stringifyYaml(e.details)}`;
      }
      return { title: fallbackTitle, message, code: e.code, fields };
    }
    if (Array.isArray(body.errors)) {
      return {
        title: fallbackTitle,
        message: body.errors
          .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
          .join('\n'),
      };
    }
    return { title: fallbackTitle, message: err.message };
  }
  return {
    title: fallbackTitle,
    message: err instanceof Error ? err.message : String(err),
  };
}
