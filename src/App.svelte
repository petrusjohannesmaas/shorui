<script lang="ts">
  import { Code, PenLine } from '@lucide/svelte';
  import Editor, { type EditorMode } from './Editor.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from '$lib/components/ui/tooltip/index.js';
  import { readText, startupFile } from '$lib/platform';
  import { cn } from '$lib/utils';
  import icon from '../src-tauri/icons/32x32.png';

  let mode = $state<EditorMode>('rich');
  let filePath = $state<string | null>(null);
  let editor = $state<ReturnType<typeof Editor>>();

  const fileName = $derived(filePath ? baseName(filePath) : 'Untitled');

  function baseName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  function setMode(next: EditorMode) {
    mode = next;
  }

  // The file the app was started with, if the user opened Shorui with one.
  $effect(() => {
    startupFile()
      .then(async (path) => {
        if (!path) return;
        const text = await readText(path);
        editor?.setContent(text);
        filePath = path;
      })
      .catch((error: unknown) => console.error('Could not open the startup file', error));
  });

  function onkeydown(event: KeyboardEvent) {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() !== 'm') return;
    event.preventDefault();
    mode = mode === 'rich' ? 'code' : 'rich';
  }
</script>

<svelte:window {onkeydown} />

<div class="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
  <header
    class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-3 py-1.5 select-none"
  >
    <div class="flex min-w-0 items-center gap-1">
      <img src={icon} alt="Shorui" class="size-[21px]" />
    </div>

    <div class="min-w-0 px-2 text-center">
      <span
        data-testid="file-name"
        title={filePath ?? 'Untitled'}
        class="block truncate text-sm font-medium">{fileName}</span
      >
    </div>

    <div class="flex items-center justify-end gap-1">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger
            aria-label="Rich"
            aria-pressed={mode === 'rich'}
            class={cn(buttonVariants({ variant: mode === 'rich' ? 'default' : 'ghost', size: 'sm' }))}
            onclick={() => setMode('rich')}
          >
            <PenLine class="size-4" aria-hidden="true" />
            Rich
          </TooltipTrigger>
          <TooltipContent side="bottom">Rich editor (Alt+M)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Code"
            aria-pressed={mode === 'code'}
            class={cn(buttonVariants({ variant: mode === 'code' ? 'default' : 'ghost', size: 'sm' }))}
            onclick={() => setMode('code')}
          >
            <Code class="size-4" aria-hidden="true" />
            Code
          </TooltipTrigger>
          <TooltipContent side="bottom">Code mode (Alt+M)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </header>

  <main class="flex min-h-0 flex-1 overflow-hidden">
    <Editor bind:this={editor} {mode} />
  </main>
</div>
