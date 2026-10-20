import { scale, stepHex, contrast } from './scale';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const press = (root: Element, selector: string, on: Element) =>
  root.querySelectorAll(selector).forEach((b) => b.setAttribute('aria-pressed', String(b === on)));

/* ---------- shape: border radius and border width ---------- */
document.querySelectorAll<HTMLElement>('[data-shape]').forEach((root) => {
  const names: Record<string, string> = { radius: 'Border radius', border: 'Border width' };
  const vars: Record<string, string> = { radius: '--r', border: '--b' };
  root.querySelectorAll<HTMLButtonElement>('[data-token]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind!;
      root.querySelectorAll(`[data-kind="${kind}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      root.style.setProperty(vars[kind], btn.dataset.px + 'px');
      root.querySelector(`[data-label-${kind}]`)!.textContent = `${names[kind]}/${btn.dataset.token} = ${btn.dataset.px}px`;
    }),
  );
});

/* ---------- motion ---------- */
const CURVES: Record<string, number[]> = { Standard: [0.2, 0, 0, 1], Enter: [0, 0, 0, 1], Exit: [0.3, 0, 1, 1], Linear: [0, 0, 1, 1] };
document.querySelectorAll<HTMLElement>('[data-motion]').forEach((root) => {
  let ms = 1000, dur = 'Default', ease = 'Standard';
  const dot = root.querySelector<HTMLElement>('[data-dot]')!;
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const path = root.querySelector('[data-curve]')!;
  const readout = root.querySelector('[data-readout]')!;
  const draw = () => {
    const [a, b, c, d] = CURVES[ease];
    path.setAttribute('d', `M0,100 C${a * 100},${100 - b * 100} ${c * 100},${100 - d * 100} 100,0`);
    readout.innerHTML = `Motion/Duration/${dur} = ${ms}ms<br />Motion/Easing/${ease} = cubic-bezier(${CURVES[ease].join(', ')})`;
  };
  const play = () => {
    dot.getAnimations().forEach((a) => a.cancel());
    const dist = track.clientWidth - dot.offsetWidth - 8;
    dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dist}px)` }], {
      duration: reduced ? 0 : ms,
      easing: `cubic-bezier(${CURVES[ease].join(',')})`,
      fill: 'forwards',
    });
  };
  root.querySelectorAll<HTMLButtonElement>('[data-dur]').forEach((b) =>
    b.addEventListener('click', () => { ms = Number(b.dataset.dur); dur = b.dataset.name!; press(root, '[data-dur]', b); draw(); play(); }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-ease]').forEach((b) =>
    b.addEventListener('click', () => { ease = b.dataset.ease!; press(root, '[data-ease]', b); draw(); play(); }),
  );
  root.querySelector('[data-play]')!.addEventListener('click', play);
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(root);
  }
});

/* ---------- contrast fix (one pair, same rule as the skill: closest passing step of the same role) ---------- */
document.querySelectorAll<HTMLElement>('[data-contrast]').forEach((root) => {
  const steps = scale('#5C3FC4'); // Primary, 950 to 50
  const surfaces = { light: { hex: '#FFFFFF', name: 'White' }, dark: { hex: stepHex('#6B7280', '900'), name: 'Neutral/900' } };
  const AA = 4.5;
  let mode: 'light' | 'dark' = 'dark';
  let idx = 6;
  const $ = (s: string) => root.querySelector<HTMLElement>(s)!;
  const range = $('[data-range]') as unknown as HTMLInputElement;
  const paint = (el: HTMLElement, fg: string, bg: string) => { el.style.background = bg; el.style.color = fg; };
  const render = () => {
    const bg = surfaces[mode].hex;
    const fg = steps[idx].hex;
    const r = contrast(fg, bg);
    $('[data-step-name]').textContent = `Primary/${steps[idx].step}`;
    paint($('[data-now]'), fg, bg);
    $('[data-now-ratio]').textContent = `${r.toFixed(2)}:1 on ${surfaces[mode].name}`;
    const nowBadge = $('[data-now-badge]');
    nowBadge.textContent = r >= AA ? 'passes AA' : `fails AA, needs ${AA}:1`;
    nowBadge.className = 'd-badge ' + (r >= AA ? 'd-badge--pass' : 'd-badge--fail');
    let fix = -1;
    if (r < AA) {
      let best = 0;
      steps.forEach((s, i) => {
        const c = contrast(s.hex, bg);
        if (c < AA) return;
        const better = fix < 0 || Math.abs(i - idx) < Math.abs(fix - idx) || (Math.abs(i - idx) === Math.abs(fix - idx) && c > best);
        if (better) { fix = i; best = c; }
      });
    }
    const fixBox = $('[data-fix]');
    const apply = $('[data-apply]') as HTMLButtonElement;
    if (r >= AA) {
      paint(fixBox, fg, bg);
      $('[data-fix-ratio]').textContent = 'No change needed';
      $('[data-fix-badge]').textContent = 'unchanged';
      $('[data-msg]').textContent = '';
      apply.disabled = true;
    } else if (fix >= 0) {
      paint(fixBox, steps[fix].hex, bg);
      $('[data-fix-ratio]').textContent = `Primary/${steps[fix].step}: ${contrast(steps[fix].hex, bg).toFixed(2)}:1`;
      $('[data-fix-badge]').textContent = 'passes AA';
      $('[data-msg]').textContent = '';
      apply.disabled = false;
      apply.dataset.to = String(fix);
    } else {
      paint(fixBox, fg, bg);
      $('[data-fix-ratio]').textContent = 'No step passes';
      $('[data-fix-badge]').textContent = 'unfixable';
      $('[data-msg]').textContent = 'No single step passes. Change the surface instead.';
      apply.disabled = true;
    }
  };
  range.addEventListener('input', () => { idx = Number(range.value); render(); });
  root.querySelectorAll<HTMLButtonElement>('[data-surface]').forEach((b) =>
    b.addEventListener('click', () => { mode = b.dataset.surface as 'light' | 'dark'; press(root, '[data-surface]', b); render(); }),
  );
  $('[data-apply]').addEventListener('click', (e) => {
    idx = Number((e.currentTarget as HTMLElement).dataset.to);
    range.value = String(idx);
    render();
  });
  render();
});

/* ---------- export tabs ---------- */
document.querySelectorAll<HTMLElement>('[data-export]').forEach((root) => {
  root.querySelectorAll<HTMLButtonElement>('[data-tabbtn]').forEach((b) =>
    b.addEventListener('click', () => {
      root.dataset.tab = b.dataset.tabbtn!;
      press(root, '[data-tabbtn]', b);
      root.querySelectorAll('.d-code').forEach((p) => p.classList.toggle('is-in', (p as HTMLElement).dataset.pane === b.dataset.tabbtn));
    }),
  );
});

/* ---------- starter run ---------- */
document.querySelectorAll<HTMLElement>('[data-starter]').forEach((root) => {
  const items = [...root.querySelectorAll<HTMLElement>('.d-steps li')];
  const status = root.querySelector('[data-status]')!;
  const run = root.querySelector<HTMLButtonElement>('[data-run]')!;
  const dryBox = root.querySelector<HTMLInputElement>('[data-dryrun]')!;
  const dryTag = root.querySelector('[data-dry]')!;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  dryBox.addEventListener('change', () => { dryTag.textContent = dryBox.checked ? ' dry run' : ''; });
  run.addEventListener('click', async () => {
    run.disabled = true;
    const dry = dryBox.checked;
    items.forEach((li) => { li.classList.remove('done'); li.querySelector('.tick')!.textContent = '·'; });
    for (let i = 0; i < items.length; i++) {
      status.textContent = `${dry ? 'Planning' : 'Running'} step ${i + 1} of ${items.length}…`;
      await wait(450);
      items[i].classList.add('done');
      items[i].querySelector('.tick')!.textContent = dry ? '○' : '✓';
    }
    status.textContent = dry ? 'Dry run: this is the plan. Nothing was written.' : 'Done. The system and the Design Tokens page are in your file.';
    run.disabled = false;
  });
});
