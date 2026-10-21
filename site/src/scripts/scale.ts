// Port of .claude/skills/figma-color-scale/scripts/color_scale.py.
// The base hex is the 500 step; darker steps are the base at a lower opacity over
// pure black, lighter steps over pure white, flattened per channel and rounded.

type Rgb = [number, number, number];

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

// [step, opacity of the base color, surface underneath]
const STEPS: [string, number, Rgb | null][] = [
  ['950', 0.1, BLACK],
  ['900', 0.2, BLACK],
  ['800', 0.4, BLACK],
  ['700', 0.6, BLACK],
  ['600', 0.8, BLACK],
  ['500', 1, null],
  ['400', 0.8, WHITE],
  ['300', 0.6, WHITE],
  ['200', 0.4, WHITE],
  ['100', 0.2, WHITE],
  ['50', 0.1, WHITE],
];

export interface ScaleStep { step: string; hex: string; }

export function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

const toHex = (rgb: Rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();

export function scale(hex: string): ScaleStep[] {
  const base = toRgb(hex);
  return STEPS.map(([step, opacity, surface]) => ({
    step,
    hex: toHex(
      surface
        ? (base.map((c, i) => Math.floor(c * opacity + surface[i] * (1 - opacity) + 0.5)) as Rgb)
        : base,
    ),
  }));
}

/** Readable ink for text drawn on a swatch. */
export function ink(hex: string): string {
  const lum = toRgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  return lum > 0.4 ? '#08080b' : '#ffffff';
}

export const stepHex = (hex: string, step: string) => scale(hex).find((s) => s.step === step)!.hex;

function luminance(hex: string): number {
  return toRgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
