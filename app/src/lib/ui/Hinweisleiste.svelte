<script lang="ts">
  import { hinweis } from '$lib/speicher.svelte';
</script>

{#if hinweis.text}
  <div class="leiste" role="status">
    <span>{hinweis.text}</span>
    {#if hinweis.rueck}
      <button onclick={() => { hinweis.rueck?.(); hinweis.text = ''; }}>Rückgängig</button>
    {/if}
  </div>
{/if}

<style>
  .leiste {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(24px + env(safe-area-inset-bottom) + var(--unten, 0px));
    background: #1d2125; color: #f5f3ee; border-radius: var(--leo-r-m); padding: 10px 12px 10px 18px; display: flex; gap: 16px; align-items: center;
    box-shadow: var(--leo-schatten-pop); z-index: 60; max-width: calc(100vw - 32px);
  }
  button { background: none; border: 0; color: #e2b23c; font-weight: 700; padding: 6px 8px; min-height: 36px; }
</style>
