<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  // The Alert Dialog keeps the focus inside, closes on Escape and returns the
  // focus where it was. The title, the body and the two callbacks stay the same
  // as the hand-written dialog had, so callers do not change.
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

  // A modal dialog stops every key from reaching the shell behind it. Escape
  // cancels, and the arrow keys and Backspace leave the module alone.
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
