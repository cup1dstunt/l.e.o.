// Kurzer Tipp = sofort bewerten, Doppelklick (PC) oder langes Drücken (Touch) = Fenster öffnen (E66, E73b)
export function druck(node: HTMLElement, opt: { kurz: () => void; lang: () => void }) {
  let o = opt;
  let t: ReturnType<typeof setTimeout> | undefined;
  let langAusgeloest = false;
  const start = (e: PointerEvent) => {
    if (e.button !== 0) return;
    langAusgeloest = false;
    clearTimeout(t);
    t = setTimeout(() => {
      langAusgeloest = true;
      navigator.vibrate?.(15);
      o.lang();
    }, 480);
  };
  const stopp = () => clearTimeout(t);
  const klick = (e: MouseEvent) => {
    if (langAusgeloest) {
      langAusgeloest = false;
      e.preventDefault();
      return;
    }
    o.kurz();
  };
  const doppel = (e: MouseEvent) => {
    e.preventDefault();
    o.lang();
  };
  const menue = (e: Event) => e.preventDefault();
  node.addEventListener('pointerdown', start);
  node.addEventListener('pointerup', stopp);
  node.addEventListener('pointerleave', stopp);
  node.addEventListener('pointercancel', stopp);
  node.addEventListener('click', klick);
  node.addEventListener('dblclick', doppel);
  node.addEventListener('contextmenu', menue);
  return {
    update(n: typeof opt) { o = n; },
    destroy() {
      node.removeEventListener('pointerdown', start);
      node.removeEventListener('pointerup', stopp);
      node.removeEventListener('pointerleave', stopp);
      node.removeEventListener('pointercancel', stopp);
      node.removeEventListener('click', klick);
      node.removeEventListener('dblclick', doppel);
      node.removeEventListener('contextmenu', menue);
    }
  };
}
