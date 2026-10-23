<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import { Button } from '$lib/components/ui/button/index.js';
  import { accents, type AccentId } from '$lib/accents';
  import { settings } from '$lib/settings.svelte';
  import { screenTransition } from '$lib/motion';
  import { themes, type ThemeId } from '../themes';

  // The change shows at once. A failed save only means it won't survive a
  // restart, so it is logged rather than undone.
  const logFailure = (error: unknown) => console.error('Could not save settings', error);
  const chooseTheme = (id: ThemeId) => settings.setTheme(id).catch(logFailure);
  const chooseAccent = (id: AccentId) => settings.setAccent(id).catch(logFailure);
</script>

<section
  data-testid="settings-panel"
  aria-label="Settings"
  class="absolute inset-0 z-10 overflow-y-auto bg-background text-foreground"
  transition:screenTransition
>
  <div class="mx-auto flex max-w-xl flex-col gap-8 px-6 py-8">
    <section class="flex flex-col gap-3">
      <h2 id="theme-label" class="text-sm font-medium text-muted-foreground">Theme</h2>
      <!-- One button per theme in src/themes, so a new theme appears here on its own. -->
      <div role="group" aria-labelledby="theme-label" class="inline-flex w-fit gap-1 rounded-lg bg-card p-1">
        {#each themes as theme (theme.id)}
          {@const chosen = settings.theme === theme.id}
          <Button
            variant={chosen ? 'default' : 'ghost'}
            aria-pressed={chosen}
            class="px-5"
            onclick={() => chooseTheme(theme.id)}
          >
            {theme.name}
          </Button>
        {/each}
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 id="accent-label" class="text-sm font-medium text-muted-foreground">Accent colour</h2>
      <div role="group" aria-labelledby="accent-label" class="flex flex-wrap gap-3">
        {#each accents as accent (accent.id)}
          {@const chosen = settings.accent === accent.id}
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={accent.name}
            aria-pressed={chosen}
            title={accent.name}
            class={['rounded-full', chosen && 'ring-2 ring-foreground ring-offset-2 ring-offset-background']}
            style="background-color: {accent.hex}"
            onclick={() => chooseAccent(accent.id)}
          >
            {#if chosen}
              <Check aria-hidden="true" class="size-5 text-white" />
            {/if}
          </Button>
        {/each}
      </div>
    </section>
  </div>
</section>
