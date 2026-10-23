<script lang="ts">
  // One message at a time, in the bottom centre, sitting over the editor.
  let { message }: { message: string | null } = $props();
</script>

{#if message}
  <div
    role="status"
    data-testid="toast"
    class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-lg"
  >
    {message}
  </div>
{/if}
