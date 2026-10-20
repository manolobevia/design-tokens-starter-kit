import { scale, ink } from './scale';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- scroll reveals ---------- */
const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduced || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { threshold: 0.3 },
  );
  reveals.forEach((el) => io.observe(el));
}

/* ---------- two-way toggles (Light/Dark, Desktop/Mobile) ---------- */
function toggle(root: HTMLElement, apply: (mode: string) => void) {
  root.querySelectorAll<HTMLButtonElement>('[data-set]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const mode = btn.dataset.set!;
      root.dataset.mode = mode;
      root.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      apply(mode);
    }),
  );
}
document.querySelectorAll<HTMLElement>('[data-mapped-demo]').forEach((el) =>
  toggle(el, (mode) => el.setAttribute('style', el.dataset[mode]!)),
);
document.querySelectorAll<HTMLElement>('[data-type-demo]').forEach((el) => toggle(el, () => {}));

/* ---------- color demo (same math as figma-color-scale) ---------- */
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : 'Color');

function fillRows(root: HTMLElement, name: string, hex: string) {
  const rows = root.querySelector('[data-rows]')!;
  rows.replaceChildren(
    ...scale(hex).map((s) => {
      const li = document.createElement('li');
      li.style.cssText = `--c:${s.hex};--ink:${ink(s.hex)}`;
      const a = document.createElement('span');
      a.textContent = `${name}/${s.step}${s.step === '500' ? ' Default' : ''}`;
      const b = document.createElement('span');
      b.className = 'mono';
      b.textContent = s.hex;
      li.append(a, b);
      return li;
    }),
  );
  root.querySelector('[data-line]')!.textContent = `${name}:${hex.toUpperCase()}`;
}
document.querySelectorAll<HTMLElement>('[data-color-demo]').forEach((root) => {
  const nameEl = root.querySelector<HTMLInputElement>('[data-name]')!;
  const hexEl = root.querySelector<HTMLInputElement>('[data-hex]')!;
  const update = () => fillRows(root, cap(nameEl.value.trim().replace(/\s+/g, '')), hexEl.value);
  nameEl.addEventListener('input', update);
  hexEl.addEventListener('input', update);
});

/* ---------- hero: type the line, generate the ramp, shift the glow ---------- */
const hero = document.querySelector<HTMLElement>('[data-hero-demo]');
if (hero && !reduced) {
  const typed = hero.querySelector<HTMLElement>('[data-typed]')!;
  const strip = hero.querySelector<HTMLElement>('[data-strip]')!;
  const caption = hero.querySelector<HTMLElement>('[data-caption]')!;
  const glowHost = document.querySelector<HTMLElement>('[data-glow]');
  const colors = [
    ['Purple', '#5C3FC4'],
    ['Teal', '#0F766E'],
    ['Coral', '#E4572E'],
    ['Gold', '#B7791F'],
  ];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let i = 0;
  (async function loop() {
    for (;;) {
      const [name, hex] = colors[i++ % colors.length];
      const line = `${name}:${hex}`;
      strip.classList.add('is-hidden');
      typed.textContent = '';
      for (const ch of line) { typed.textContent += ch; await wait(55); }
      await wait(250);
      const steps = scale(hex);
      strip.querySelectorAll<HTMLElement>('li').forEach((li, k) => {
        li.style.cssText = `--c:${steps[k].hex};--ink:${ink(steps[k].hex)};transition-delay:${k * 60}ms`;
      });
      strip.classList.remove('is-hidden');
      caption.textContent = `11 variables written to Brand/${name}`;
      glowHost?.style.setProperty('--glow-color', hex);
      await wait(3200);
    }
  })();
}
