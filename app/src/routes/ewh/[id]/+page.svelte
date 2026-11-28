<script lang="ts">
  // Klausurnoten aus EWH Korrektur übernehmen (optionales Modul, Backlog N4). Nur die Note, keine EWH-Inhalte (E4).
  // Ablauf ohne Dialog: Datei wählen → Spalte wählen → Vorschau prüfen → übernehmen (mit Rückgängig).
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { schuelerVon, name, datumKurz, heuteISO } from '$lib/hilfen';
  import { ewhLesen, zuordnen, vorschau, uebernehmen, zellText, type EwhDatei, type Zuordnung } from '$lib/ewh';
  import { istAn } from '$lib/module';
  import KursKopf from '$lib/ui/KursKopf.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);
  const klausuren = $derived(kurs.leistungen.filter((l) => l.gruppe === 'klausuren'));

  let datei = $state<EwhDatei | null>(null);
  let fehler = $state('');
  let wahl = $state(0); // Klausur in der Halbjahresübersicht
  let ziel = $state<string>(''); // leistungId oder '' = neue Spalte
  let neuName = $state('');
  let zuordnung = $state<Zuordnung[]>([]);
  let eingabe = $state<HTMLInputElement>();

  const klausur = $derived(datei?.klausuren[wahl]);
  const v = $derived(klausur ? vorschau(kurs, ziel || null, zuordnung) : []);
  const zaehl = $derived({
    neu: v.filter((x) => x.aenderung === 'neu').length,
    aendert: v.filter((x) => x.aenderung === 'aendert').length,
    gleich: v.filter((x) => x.aenderung === 'gleich').length,
    ohne: v.filter((x) => x.aenderung === 'ohne' || x.aenderung === 'behalten').length,
    unklar: zuordnung.filter((z) => !z.sid).length
  });
  let adresseFehler = $state('');
  function adresseSetzen(e: Event) {
    const w = (e.currentTarget as HTMLInputElement).value.trim();
    if (w && !/^https?:\/\/[^\s]+$/i.test(w)) { adresseFehler = 'Bitte eine Adresse mit https:// eingeben.'; return; }
    adresseFehler = '';
    if (w) d.einstellungen.ewhAdresse = w; else delete d.einstellungen.ewhAdresse;
    speichern();
    zeige(w ? 'EWH-Adresse gespeichert' : 'EWH-Adresse entfernt');
  }
  const fehlenInDatei = $derived(liste.filter((s) => !zuordnung.some((z) => z.sid === s.id)));

  async function lesen() {
    const f = eingabe?.files?.[0];
    if (eingabe) eingabe.value = '';
    if (!f) return;
    const r = ewhLesen(await f.text(), f.name);
    if ('fehler' in r) { fehler = r.fehler; datei = null; return; }
    fehler = '';
    datei = r;
    waehlen(0);
  }
  function waehlen(i: number) {
    wahl = i;
    const k = datei!.klausuren[i];
    zuordnung = zuordnen(k.werte, liste);
    neuName = k.titel;
    // Vorschlag: Spalte mit gleichem Datum oder gleichem Namen, sonst neue Spalte
    ziel = klausuren.find((l) => (k.datum && l.datum === k.datum) || l.name.toLowerCase() === k.titel.toLowerCase() || l.ewh?.titel === k.titel)?.id ?? '';
  }
  function zuweisen(i: number, sid: string) {
    for (const z of zuordnung) if (z.sid === sid) z.sid = null; // niemand doppelt
    zuordnung[i].sid = sid || null;
    zuordnung[i].sicher = false;
  }
  const LABEL = { neu: 'neu', aendert: 'ändert', gleich: 'gleich', behalten: 'bleibt (schon geklärt)', ohne: '—' } as const;

  function los() {
    if (!klausur) return;
    const vorher = { leistungen: JSON.stringify(kurs.leistungen), zellen: JSON.stringify(kurs.zellen) };
    const r = uebernehmen(kurs, ziel ? { leistungId: ziel } : { neu: { id: neueId(), name: neuName.trim() || klausur.titel, datum: klausur.datum } }, v, { titel: klausur.titel, geholt: heuteISO() });
    speichern();
    zeige(`${r.geschrieben} Einträge in „${r.leistung.name}“ übernommen`, () => {
      kurs.leistungen = JSON.parse(vorher.leistungen);
      kurs.zellen = JSON.parse(vorher.zellen);
      speichern();
    });
    goto(`/kurs/${kurs.id}`);
  }
</script>

<svelte:head><title>{kurs?.name} · aus EWH übernehmen</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="noten" info="Klausurnoten aus EWH Korrektur übernehmen" />
  <div class="seite">
    {#if !istAn(d.einstellungen, 'ewh')}
      <p class="karte">Die EWH-Übernahme ist ausgeschaltet. Einschalten unter <a href="/mehr">Mehr › Module</a>.</p>
    {:else}
      <section class="karte">
        <h2>1 · Datei aus EWH wählen</h2>
        <p class="klein">In EWH: Statistik der Klausur › Weitere › <b>Notenliste als CSV</b>, oder in der Klasse die <b>Notenübersicht Halbjahr</b> als CSV. L.E.O. übernimmt nur die Punkte, keine Kommentare und keinen Erwartungshorizont. Die Datei bleibt auf diesem Gerät.</p>
        <div class="zeile wrap">
          <button class="knopf haupt" onclick={() => eingabe?.click()}>CSV-Datei wählen</button>
          <input type="file" accept=".csv,text/csv" bind:this={eingabe} onchange={lesen} hidden />
          {#if klausur}<span class="klein leise">{datei?.art === 'halbjahr' ? 'Notenübersicht' : 'Notenliste'} mit {klausur.werte.length} Zeilen</span>{/if}
        </div>
        {#if fehler}<p class="klein warn">{fehler}</p>{/if}
        <details class="adresse">
          <summary class="klein">Link zu EWH (optional)</summary>
          <p class="klein leise">Trägst du die Adresse deiner EWH-Installation ein, zeigt die Auswertung an übernommenen Klausuren einen Link „Genaueres in EWH“. Es werden keine Daten gesendet.</p>
          <input type="url" placeholder="https://ewh.example.de" value={d.einstellungen.ewhAdresse ?? ''} onchange={adresseSetzen} aria-label="Adresse von EWH" />
          {#if adresseFehler}<p class="klein warn">{adresseFehler}</p>{/if}
        </details>
        {#if datei && datei.klausuren.length > 1}
          <p class="klein leise">Welche Klausur?</p>
          <div class="zeile wrap">{#each datei.klausuren as k, i}<button class="pille" aria-pressed={wahl === i} onclick={() => waehlen(i)}>{k.titel}{k.datum ? ' · ' + datumKurz(k.datum) : ''}</button>{/each}</div>
        {/if}
      </section>

      {#if klausur}
        <section class="karte">
          <h2>2 · In welche Spalte?</h2>
          <div class="zeile wrap">
            {#each klausuren as l}<button class="pille" aria-pressed={ziel === l.id} onclick={() => (ziel = l.id)}>{l.name}{l.datum ? ' · ' + datumKurz(l.datum) : ''}</button>{/each}
            <button class="pille" aria-pressed={ziel === ''} onclick={() => (ziel = '')}>+ neue Klausurspalte</button>
          </div>
          {#if ziel === ''}<label class="feld neu"><span>Name der neuen Spalte</span><input bind:value={neuName} /></label>{/if}
          {#if kurs.profil === 'OSZ'}<p class="klein leise">Diese Klasse rechnet in Noten 1–6. L.E.O. setzt die Punkte nach dem Leistungsspiegel um (15–13 = 1, 12–10 = 2, 9–7 = 3, 6–5 = 4, 4–1 = 5, 0 = 6).</p>{/if}
        </section>

        <section class="karte">
          <div class="zeile"><h2 class="raum">3 · Vorschau</h2>
            <span class="klein">{zaehl.neu} neu · {zaehl.aendert} ändern{zaehl.gleich ? ` · ${zaehl.gleich} gleich` : ''}{zaehl.unklar ? ` · ` : ''}{#if zaehl.unklar}<b class="warn">{zaehl.unklar} nicht zugeordnet</b>{/if}</span>
          </div>
          <table class="zahl">
            <thead><tr><th>In EWH</th><th>In L.E.O.</th><th class="r">bisher</th><th class="r">neu</th><th>Was passiert</th></tr></thead>
            <tbody>
              {#each v as x, i}
                <tr class:aendert={x.aenderung === 'aendert'}>
                  <td>{x.z.wert.nachname}, {x.z.wert.vorname}{#if x.z.wert.bemerkung}<div class="klein leise">{x.z.wert.bemerkung}</div>{/if}</td>
                  <td>
                    {#if x.z.sicher}{name(liste.find((s) => s.id === x.z.sid)!)}
                    {:else}
                      <select class:warn={!x.z.sid} value={x.z.sid ?? ''} onchange={(e) => zuweisen(i, e.currentTarget.value)} aria-label="Schüler zuordnen">
                        <option value="">– nicht übernehmen –</option>
                        {#each liste as s}<option value={s.id}>{name(s)}</option>{/each}
                      </select>
                    {/if}
                  </td>
                  <td class="r">{zellText(x.alt) || '·'}</td>
                  <td class="r"><b>{zellText(x.neu) || '·'}</b></td>
                  <td class="klein">{LABEL[x.aenderung]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if fehlenInDatei.length}<p class="klein leise">Nicht in der Datei: {fehlenInDatei.map(name).join(', ')}. Ihre Zellen bleiben, wie sie sind.</p>{/if}
          <p class="klein leise">„offen“ heißt: in EWH nicht mitgeschrieben. Ob entschuldigt oder nicht, klärt L.E.O. mit den Fehlzeiten bzw. du im Notenbuch. Eine schon geklärte Zelle (E, UE, Note) wird dadurch nie überschrieben.</p>
          <div class="zeile wrap">
            <button class="knopf haupt" disabled={zaehl.neu + zaehl.aendert === 0} onclick={los}>{zaehl.neu + zaehl.aendert} Einträge übernehmen</button>
            <a class="knopf leise" href="/kurs/{kurs.id}">Abbrechen</a>
          </div>
        </section>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .seite { padding: 16px 32px 40px; max-width: 980px; display: flex; flex-direction: column; gap: 16px; }
  .wrap { flex-wrap: wrap; margin: 10px 0; }
  .neu { max-width: 360px; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--leo-linie); }
  td { padding: 6px 8px; border-bottom: 1px dashed var(--leo-linie-fein); }
  tr.aendert td { background: var(--leo-stern-hell); }
  .r { text-align: right; white-space: nowrap; }
  select { min-height: 34px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-s); background: var(--leo-karte); color: var(--leo-tinte); padding: 0 8px; }
  select.warn { border-color: var(--leo-warnung); }
  .warn { color: var(--leo-warnung); }
  @media (max-width: 720px) { .seite { padding: 12px 16px 40px; } td, th { padding: 6px 4px; } }
  .adresse { margin-top: 12px; }
  .adresse input { width: 100%; max-width: 420px; min-height: 40px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 0 10px; background: var(--leo-karte); color: var(--leo-tinte); }
</style>
