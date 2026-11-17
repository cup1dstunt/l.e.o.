<script lang="ts">
  // Dynamischer Zeitbalken von Beginn bis Ende der Stunde, keine Phasen (E50)
  import { minuten } from '$lib/hilfen';
  let { beginn, ende, jetzt }: { beginn: string; ende: string; jetzt: number } = $props();
  const b = $derived(minuten(beginn));
  const e = $derived(minuten(ende));
  const anteil = $derived(Math.max(0, Math.min(1, (jetzt - b) / (e - b))));
  const rest = $derived(Math.max(0, e - jetzt));
</script>

<div class="zb">
  <div class="beschr zahl"><span>{beginn}</span><b>{jetzt < b ? `beginnt in ${b - jetzt} min` : rest > 0 ? `noch ${rest} min` : 'vorbei'}</b><span>{ende}</span></div>
  <div class="balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(anteil * 100)}>
    <div class="voll" style:width="{anteil * 100}%"></div>
    <div class="jetzt" style:left="{anteil * 100}%"></div>
  </div>
</div>

<style>
  .beschr { display: flex; justify-content: space-between; font-size: var(--leo-text-s); color: var(--leo-leise); margin-bottom: 6px; }
  .beschr b { color: var(--leo-tinte); font-weight: 600; }
  .balken { position: relative; height: 10px; border-radius: 99px; background: var(--leo-taste); }
  .voll { height: 100%; border-radius: 99px; background: var(--leo-akzent-hell); border: 1px solid var(--leo-akzent); }
  .jetzt { position: absolute; top: -4px; width: 3px; height: 18px; border-radius: 2px; background: var(--leo-akzent); transform: translateX(-1px); }
</style>
