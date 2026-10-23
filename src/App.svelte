<script lang="ts">
  import { tick } from 'svelte';
  import { ArrowLeft, Code, FilePlus, FolderOpen, PenLine, Save, Settings } from '@lucide/svelte';
  import Editor, { type EditorMode } from './Editor.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import Toast from './components/Toast.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from '$lib/components/ui/tooltip/index.js';
  import { openDialog, readText, saveDialog, startupFile, writeText } from '$lib/platform';
  import { settings } from '$lib/settings.svelte';
  import { cn } from '$lib/utils';
  import icon from '../src-tauri/icons/32x32.png';

  let mode = $state<EditorMode>('rich');
  let filePath = $state<string | null>(null);
  let dirty = $state(false);
  let editor = $state<ReturnType<typeof Editor>>();
  // The action waiting on the unsaved-changes prompt, or null when it is shut.
  let pending = $state<'new' | 'open' | null>(null);
  let toast = $state<string | null>(null);
  let settingsOpen = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const fileName = $derived(filePath ? baseName(filePath) : 'Untitled');

  function baseName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  function setMode(next: EditorMode) {
    mode = next;
  }

  function openSettings() {
    settingsOpen = true;
  }

  // The editor stayed mounted the whole time, so closing only puts the caret
  // back in it. The focus waits for the DOM update that takes the editor out
  // of its inert state, since an inert editor cannot take focus.
  function closeSettings() {
    settingsOpen = false;
    void tick().then(() => editor?.focus());
  }

  // The file the app was started with, if the user opened Shorui with one.
  $effect(() => {
    startupFile()
      .then(async (path) => {
        if (!path) return;
        replaceDocument(await readText(path), path);
      })
      .catch((error: unknown) => console.error('Could not open the startup file', error));
  });

  function onkeydown(event: KeyboardEvent) {
    // Alt+T switches the theme on either screen.
    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key.toLowerCase() === 't'
    ) {
      event.preventDefault();
      void settings.toggleTheme().catch((error: unknown) =>
        console.error('Could not save settings', error),
      );
      return;
    }
    // The editor's shortcuts need the editor in front. Settings closes with
    // Escape and nothing else.
    if (settingsOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSettings();
      }
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        newFile();
        return;
      }
      if (key === 'o') {
        event.preventDefault();
        void openFile();
        return;
      }
      if (key === 's') {
        event.preventDefault();
        void saveFile();
        return;
      }
    }
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() !== 'm') return;
    event.preventDefault();
    mode = mode === 'rich' ? 'code' : 'rich';
  }

  // Loads the file the user picks in the open dialog, asking first when the
  // current document has unsaved changes.
  async function openFile() {
    if (dirty) {
      pending = 'open';
      return;
    }
    await loadFile();
  }

  // A file that cannot be read leaves the document as it was.
  async function loadFile() {
    const path = await openDialog();
    if (!path) return;
    let text: string;
    try {
      text = await readText(path);
    } catch (error) {
      console.error('Could not open the file', error);
      showToast(`Could not open ${baseName(path)}`);
      return;
    }
    replaceDocument(text, path);
  }

  // Runs the action the prompt was holding back.
  function continueWithoutSaving() {
    const action = pending;
    pending = null;
    if (action === 'open') void loadFile();
    if (action === 'new') clearDocument();
  }

  function newFile() {
    if (dirty) {
      pending = 'new';
      return;
    }
    clearDocument();
  }

  function clearDocument() {
    replaceDocument('', null);
  }

  // Puts a whole new document in the editor, with the path it came from, or
  // null for an Untitled one. Nothing in it is unsaved yet.
  function replaceDocument(text: string, path: string | null) {
    editor?.setContent(text);
    filePath = path;
    dirty = false;
  }

  // Saves to the open file, or asks for a path first when the document is new.
  // The path becomes the document's only after the write succeeds, so a failed
  // save leaves the old name and the unsaved dot.
  async function saveFile() {
    const text = editor?.getContent() ?? '';
    const path = filePath ?? (await saveDialog('untitled.md'));
    if (!path) return;
    try {
      await writeText(path, text);
    } catch (error) {
      console.error('Could not save the file', error);
      showToast(`Could not save ${baseName(path)}`);
      return;
    }
    filePath = path;
    dirty = false;
    showToast(`${baseName(path)} saved successfully`);
  }

  // Shows the one message for 2.5 seconds, or replaces the one showing.
  function showToast(message: string) {
    clearTimeout(toastTimer);
    toast = message;
    toastTimer = setTimeout(() => (toast = null), 2500);
  }
</script>

<svelte:window {onkeydown} />

<div class="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
  <header
    class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-3 py-1.5 select-none"
  >
    <div class="flex items-center gap-1">
      <img src={icon} alt="Shorui" class="size-[21px]" />
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger
            aria-label="New"
            class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            onclick={newFile}
          >
            <FilePlus class="size-4" aria-hidden="true" />
            New
          </TooltipTrigger>
          <TooltipContent side="bottom">New document (Ctrl+N)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Open"
            class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            onclick={openFile}
          >
            <FolderOpen class="size-4" aria-hidden="true" />
            Open
          </TooltipTrigger>
          <TooltipContent side="bottom">Open a file (Ctrl+O)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Save"
            class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            onclick={saveFile}
          >
            <Save class="size-4" aria-hidden="true" />
            Save
          </TooltipTrigger>
          <TooltipContent side="bottom">Save (Ctrl+S)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex min-w-0 items-center justify-center gap-1 px-2">
      <span
        data-testid="file-name"
        title={filePath ?? 'Untitled'}
        class="min-w-0 truncate text-sm font-medium">{fileName}</span
      >
      {#if dirty}
        <span
          data-testid="dirty-dot"
          role="img"
          aria-label="Unsaved changes"
          class="size-1.5 shrink-0 rounded-full bg-current"></span>
      {/if}
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

        {#if settingsOpen}
          <Tooltip>
            <TooltipTrigger
              aria-label="Back"
              class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              onclick={closeSettings}
            >
              <ArrowLeft class="size-4" aria-hidden="true" />
              Back
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to the editor (Escape)</TooltipContent>
          </Tooltip>
        {:else}
          <Tooltip>
            <TooltipTrigger
              aria-label="Settings"
              class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              onclick={openSettings}
            >
              <Settings class="size-4" aria-hidden="true" />
              Settings
            </TooltipTrigger>
            <TooltipContent side="bottom">Settings</TooltipContent>
          </Tooltip>
        {/if}
      </TooltipProvider>
    </div>
  </header>

  <main class="relative flex min-h-0 flex-1 overflow-hidden">
    <div data-testid="editor-area" inert={settingsOpen} class="flex min-h-0 min-w-0 flex-1">
      <Editor bind:this={editor} {mode} onchange={() => (dirty = true)} />
    </div>
    {#if settingsOpen}
      <SettingsPanel />
    {/if}
  </main>
</div>

{#if pending}
  <ConfirmDialog
    title="Unsaved changes"
    confirmLabel="Continue"
    onconfirm={continueWithoutSaving}
    oncancel={() => (pending = null)}
  >
    You have unsaved changes. Continue without saving?
  </ConfirmDialog>
{/if}

<Toast message={toast} />
