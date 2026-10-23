import { scale, ink } from './scale';

export const COLORS: [string, string][] = [
  ['Purple', '#5C3FC4'],
  ['Teal', '#0F766E'],
  ['Coral', '#E4572E'],
  ['Gold', '#B7791F'],
];

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Put a color ramp on the hero as --r0 (darkest) to --r10 (lightest). */
export function setRamp(host: HTMLElement, hex: string) {
  const steps = scale(hex);
  steps.forEach((s, i) => host.style.setProperty('--r' + i, s.hex));
  host.style.setProperty('--glow-color', hex);
  host.style.setProperty('--on-action', ink(steps[5].hex));
}

export async function typeInto(el: HTMLElement, text: string, ms = 55) {
  el.textContent = '';
  for (const ch of text) { el.textContent += ch; await wait(ms); }
}
