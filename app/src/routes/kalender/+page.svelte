<script lang="ts">
  // Kalender als eigener Reiter in der Navigation (Feedback 28.11.2026, E125). Vorher Ansicht „Monat“ im Stundenplan.
  import { page } from '$app/state';
  import KalenderMonat from '$lib/ui/KalenderMonat.svelte';
  const start = page.url.searchParams.get('tag') ?? undefined;
</script>

<svelte:head><title>Kalender</title></svelte:head>

<div class="seite">
  <div class="zeile wrap kopf">
    <h1>Kalender</h1>
    <a class="knopf leise" href="/stundenplan">Stundenplan ›</a>
  </div>
  <KalenderMonat {start} />
</div>

<style>
  .seite { padding: 24px 32px 40px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .wrap { flex-wrap: wrap; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
  .kopf { justify-content: space-between; }
</style>
