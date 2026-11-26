// @ts-nocheck – reines Browser-JavaScript für den Schülerbogen (FB7b, E116), geprüft durch tests/selbst.test.ts.
// Verschlüsselt die Antwort im Browser des Schülers: ECDH P-256 mit einmaligem Schlüssel + AES-GCM,
// Zusatzdaten = Hash des Links (gegen Vertauschen). Gegenstück: src/lib/selbst.ts antwortLesen.
export const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (u) => [...new Uint8Array(u)].map((x) => x.toString(16).padStart(2, '0')).join('');
export async function linkHash(t) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('leo-selbst|' + t))); }
export async function verschluesseln(oeff, hash, inhalt) {
  const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: oeff.x, y: oeff.y }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const eigen = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, eigen.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const geheim = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(hash) }, k, new TextEncoder().encode(JSON.stringify(inhalt)));
  const epk = await crypto.subtle.exportKey('jwk', eigen.publicKey);
  return { epk: { kty: 'EC', crv: 'P-256', x: epk.x, y: epk.y }, iv: b64(iv), geheim: b64(geheim) };
}
