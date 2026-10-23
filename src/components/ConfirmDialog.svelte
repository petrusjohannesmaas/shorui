<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  // Asks before the user discards unsaved text. The focus starts on Cancel, so
  // a stray Enter keeps the text, and the confirm button is the destructive one.
  let {
    title,
    confirmLabel = 'Confirm',
    onconfirm,
    oncancel,
    children,
  }: {
    title: string;
    confirmLabel?: string;
    onconfirm: () => void;
    oncancel: () => void;
    children?: Snippet;
  } = $props();

  let cancelButton = $state<HTMLButtonElement | null>(null);

  // The window's keydown handler in App.svelte runs Ctrl+N, Ctrl+O, Ctrl+S and
  // Alt+M. Stopping propagation here keeps those shortcuts from acting on the
  // document behind the dialog. Escape cancels.
  function onkeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
    }
  }
</script>

<AlertDialog.Root open>
  <AlertDialog.Content
    onkeydown={onkeydown}
    onOpenAutoFocus={(event) => {
      event.preventDefault();
      cancelButton?.focus();
    }}
  >
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>{@render children?.()}</AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel bind:ref={cancelButton} onclick={oncancel}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={onconfirm}>{confirmLabel}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
