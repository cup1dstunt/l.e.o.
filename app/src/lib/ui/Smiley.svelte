<script lang="ts">
  // Eigener SVG-Satz (E52, E56): die Gesichtsform trägt die Stufe, die Farbe nur zusätzlich.
  let { stufe, groesse = 32, leer = false }: { stufe: number; groesse?: number; leer?: boolean } = $props();
  const munde: Record<number, string> = {
    1: 'M11 22.5 Q20 33.5 29 22.5 Z',
    2: 'M13 24 Q20 30 27 24',
    3: 'M13.5 26 L26.5 26',
    4: 'M13.5 28.5 Q20 23.5 26.5 28.5',
    5: 'M12.5 29.5 Q20 21.5 27.5 29.5'
  };
  const namen = ['', 'sehr gut', 'gut', 'mittel', 'schwach', 'sehr schwach'];
</script>

<svg viewBox="0 0 40 40" width={groesse} height={groesse} role="img" aria-label={namen[stufe]}>
  <circle cx="20" cy="20" r="19" fill={leer ? 'var(--leo-taste)' : `var(--leo-mit-${stufe})`} />
  <g stroke="var(--leo-gesicht)" stroke-width="2.2" stroke-linecap="round" fill="none" opacity={leer ? 0.35 : 1}>
    <circle cx="14" cy="16" r="1.6" fill="var(--leo-gesicht)" stroke="none" />
    <circle cx="26" cy="16" r="1.6" fill="var(--leo-gesicht)" stroke="none" />
    {#if stufe === 1}<path d={munde[1]} fill="var(--leo-gesicht)" stroke-linejoin="round" />{:else}<path d={munde[stufe]} />{/if}
    {#if stufe === 5}<path d="M10.5 11 L16.5 13" /><path d="M29.5 11 L23.5 13" />{/if}
  </g>
</svg>
