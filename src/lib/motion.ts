import { fly } from 'svelte/transition';

export const SCREEN_TRANSITION_MS = 150;

// Read when each transition starts, so a change to the system setting applies
// at once.
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// The fade and slide the Settings panel appears and leaves with.
export function screenTransition(node: Element) {
  return fly(node, { y: 8, duration: prefersReducedMotion() ? 0 : SCREEN_TRANSITION_MS });
}
