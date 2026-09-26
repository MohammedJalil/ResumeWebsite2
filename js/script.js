(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  /* ------------------------------------------------------------------
     Particle field: raw data that parses itself into a name.
     ------------------------------------------------------------------ */

  function createField(canvas) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    const hero = canvas.closest('.hero');
    const FAMILY = '"Space Grotesk", system-ui, sans-serif';
    const TOKENS = [
      '<record>', '</case>', '<charge/>', '<disposition>', '{ }', 'null', '<?xml?>',
      '</>', '<court>', '[ ]', '"offense"', '<vendor_a>', '<vendor_b>', 'NaN',
      '<dob/>', '::', '0101', '<!-- -->', 'id=0x1f', '<county>', '"status"'
    ];

    // raw steel -> bronze -> silver -> gold -> bright gold
    const STOPS = [[124, 149, 179], [208, 138, 78], [214, 204, 190], [207, 214, 223], [244, 197, 92], [255, 228, 160]];
    const BUCKETS = 28;
    const palette = [];
    for (let i = 0; i < BUCKETS; i++) {
      const t = (i / (BUCKETS - 1)) * (STOPS.length - 1);
      const a = STOPS[Math.floor(t)];
      const b = STOPS[Math.min(STOPS.length - 1, Math.floor(t) + 1)];
      const f = t - Math.floor(t);
      palette.push(
        'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
        Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
        Math.round(a[2] + (b[2] - a[2]) * f) + ')'
      );
    }

    let W = 0;
    let H = 0;
    let buckets = [];
    let glyphs = [];
    let frame = 0;
    let rafId = 0;
    let running = false;
    let scrollP = 0;
    let nameTop = 0;
    let nameBottom = 0;
    const pointer = { x: -1e4, y: -1e4 };

    function measure() {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sampleTargets() {
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      const narrow = W < 700;
      const lines = narrow ? ['MOHAMMED-', 'TAQI JALIL'] : ['MOHAMMED-TAQI', 'JALIL'];
      const lh = 0.9;

      o.font = '700 100px ' + FAMILY;
      const widest = Math.max.apply(null, lines.map((l) => o.measureText(l).width));
      const maxW = W * (narrow ? 0.86 : 0.84);
      const maxH = H * (narrow ? 0.24 : 0.4);
      const size = Math.max(28, Math.min((100 * maxW) / widest, maxH / (lines.length * lh)));

      o.font = '700 ' + size + 'px ' + FAMILY;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillStyle = '#fff';

      const cy = H * (narrow ? 0.34 : 0.36);
      const blockH = size * lh * lines.length;
      const first = cy - blockH / 2 + (size * lh) / 2;
      lines.forEach((l, i) => o.fillText(l, W / 2, first + i * size * lh));

      nameTop = cy - blockH / 2;
      nameBottom = cy + blockH / 2;

      let gap = size > 150 ? 5 : size > 95 ? 4 : 3;
      const y0 = Math.max(0, Math.floor(nameTop - size * 0.3));
      const y1 = Math.min(H, Math.ceil(nameBottom + size * 0.3));
      const data = o.getImageData(0, 0, W, H).data;

      let pts = [];
      const collect = () => {
        pts = [];
        for (let y = y0; y < y1; y += gap) {
          for (let x = 0; x < W; x += gap) {
            if (data[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
          }
        }
      };
      collect();
      while (pts.length / 2 > 7000 && gap < 9) {
        gap += 1;
        collect();
      }
      return { pts: pts, gap: gap };
    }

    function build(assemble) {
      measure();
      const sample = sampleTargets();
      const pts = sample.pts;
      const size = sample.gap * 0.56;

      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        if (pts[i] < minX) minX = pts[i];
        if (pts[i] > maxX) maxX = pts[i];
      }
      const spanX = Math.max(1, maxX - minX);

      buckets = palette.map(() => []);
      for (let i = 0; i < pts.length; i += 2) {
        const tx = pts[i];
        const ty = pts[i + 1];
        const t = (tx - minX) / spanX;
        const bi = Math.round(clamp(t + (Math.random() - 0.5) * 0.1, 0, 1) * (BUCKETS - 1));
        const ang = Math.random() * Math.PI * 2;
        buckets[bi].push({
          tx: tx,
          ty: ty,
          x: assemble ? Math.random() * W : tx,
          y: assemble ? Math.random() * H : ty,
          vx: assemble ? (Math.random() - 0.5) * 3 : 0,
          vy: assemble ? (Math.random() - 0.5) * 3 : 0,
          delay: assemble ? 18 + t * 60 + Math.random() * 45 : 0,
          ox: Math.cos(ang) * (60 + Math.random() * 520),
          oy: Math.sin(ang) * (60 + Math.random() * 300) - Math.random() * 260,
          seed: Math.random() * 1000,
          s: size * (0.7 + Math.random() * 0.6)
        });
      }

      hero.style.setProperty('--hint-top', Math.round(nameBottom + Math.max(18, H * 0.03)) + 'px');
      buildGlyphs();
    }

    function buildGlyphs() {
      const n = W < 700 ? 14 : 32;
      glyphs = [];
      for (let i = 0; i < n; i++) {
        glyphs.push({
          x: Math.random() * W,
          y: Math.random() * H,
          v: 0.12 + Math.random() * 0.4,
          a: 0.05 + Math.random() * 0.13,
          t: TOKENS[(Math.random() * TOKENS.length) | 0]
        });
      }
    }

    function drawGlyphs(move) {
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = '#cfd6df';
      const fade = 1 - scrollP;
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        if (move) {
          g.x += g.v;
          if (g.x > W + 20) {
            g.x = -140;
            g.y = Math.random() * H;
            g.t = TOKENS[(Math.random() * TOKENS.length) | 0];
          }
        }
        const inName = g.y > nameTop - 20 && g.y < nameBottom + 20;
        const belowName = g.y > nameBottom + 40;
        ctx.globalAlpha = g.a * fade * (inName ? 0.35 : belowName ? 0.3 : 1);
        ctx.fillText(g.t, g.x, g.y);
      }
      ctx.globalAlpha = 1;
    }

    function tick() {
      rafId = 0;
      if (!running) return;
      frame++;

      ctx.clearRect(0, 0, W, H);
      drawGlyphs(true);

      const burst = Math.pow(scrollP, 1.5);
      const time = frame * 0.02;
      const R = W < 700 ? 64 : 115;
      const R2 = R * R;
      const px = pointer.x;
      const py = pointer.y;

      ctx.globalAlpha = 1 - scrollP * 0.75;
      for (let b = 0; b < buckets.length; b++) {
        const arr = buckets[b];
        if (!arr.length) continue;
        ctx.fillStyle = palette[b];
        ctx.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          if (frame > p.delay) {
            const tx = p.tx + p.ox * burst + Math.sin(time + p.seed) * 0.45;
            const ty = p.ty + p.oy * burst + Math.cos(time * 0.9 + p.seed) * 0.45;
            const dx = p.x - px;
            const dy = p.y - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / R) * 2.6;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
            }
            p.vx += (tx - p.x) * 0.034;
            p.vy += (ty - p.y) * 0.034;
            p.vx *= 0.84;
            p.vy *= 0.84;
          } else {
            p.vx *= 0.985;
            p.vy *= 0.985;
          }
          p.x += p.vx;
          p.y += p.vy;
          ctx.rect(p.x, p.y, p.s, p.s);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    }

    function renderStatic() {
      ctx.clearRect(0, 0, W, H);
      drawGlyphs(false);
      for (let b = 0; b < buckets.length; b++) {
        const arr = buckets[b];
        if (!arr.length) continue;
        ctx.fillStyle = palette[b];
        ctx.beginPath();
        for (let i = 0; i < arr.length; i++) ctx.rect(arr[i].tx, arr[i].ty, arr[i].s, arr[i].s);
        ctx.fill();
      }
    }

    function setRunning(on) {
      if (reduceMotion) return;
      if (on && !running) {
        running = true;
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else if (!on && running) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function shockwave(x, y) {
      const R = 240;
      for (let b = 0; b < buckets.length; b++) {
        const arr = buckets[b];
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          const dx = p.x - x;
          const dy = p.y - y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < R) {
            const f = (1 - d / R) * 22;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
      }
    }

    function localPoint(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function start() {
      build(!reduceMotion);
      let lastW = W;
      let lastH = H;

      if (reduceMotion) {
        renderStatic();
      } else {
        window.addEventListener('pointermove', (e) => {
          const pt = localPoint(e);
          pointer.x = pt.x;
          pointer.y = pt.y;
        }, { passive: true });
        const clear = () => {
          pointer.x = -1e4;
          pointer.y = -1e4;
        };
        document.addEventListener('pointerleave', clear);
        window.addEventListener('pointerup', (e) => {
          if (e.pointerType !== 'mouse') clear();
        });
        canvas.addEventListener('pointerdown', (e) => {
          const pt = localPoint(e);
          shockwave(pt.x, pt.y);
        });

        if ('IntersectionObserver' in window) {
          new IntersectionObserver((entries) => {
            setRunning(entries[0].isIntersecting && !document.hidden);
          }).observe(hero);
        } else {
          setRunning(true);
        }
        document.addEventListener('visibilitychange', () => {
          const r = hero.getBoundingClientRect();
          setRunning(!document.hidden && r.bottom > 0);
        });
      }

      window.addEventListener('resize', debounce(() => {
        const r = hero.getBoundingClientRect();
        if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 140) return;
        build(false);
        lastW = W;
        lastH = H;
        if (reduceMotion) renderStatic();
      }, 180));
    }

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      start();
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 100px "Space Grotesk"').then(go, go);
      setTimeout(go, 1800);
    } else {
      go();
    }

    return {
      setScroll(p) {
        scrollP = p;
      }
    };
  }

  /* ------------------------------------------------------------------
     Text effects
     ------------------------------------------------------------------ */

  const SCRAMBLE = '<>/{}[]#=+*01';

  function scramble(el) {
    const final = el.textContent;
    el.setAttribute('aria-label', final);
    const len = final.length;
    const reveal = [];
    for (let i = 0; i < len; i++) reveal.push((i / len) * 0.55 + Math.random() * 0.45);
    const t0 = performance.now();
    const dur = 950;

    function step(now) {
      const t = (now - t0) / dur;
      let out = '';
      for (let i = 0; i < len; i++) {
        const c = final[i];
        out += c === ' ' || t >= reveal[i] ? c : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = final;
    }
    requestAnimationFrame(step);
  }

  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    const t0 = performance.now();
    const dur = 1700;
    function step(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = String(Math.round(target * e));
      if (t < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const nav = document.getElementById('nav');
    const progress = document.getElementById('progress');
    const hero = document.querySelector('.hero');
    const canvas = document.getElementById('field');
    const field = canvas ? createField(canvas) : null;

    const pipe = document.getElementById('pipeline');
    const scrolly = root.classList.contains('scrolly') && !!pipe;
    const pipeFill = pipe && pipe.querySelector('.pipe__fill');
    const nodes = pipe ? Array.from(pipe.querySelectorAll('.pipe__node')) : [];
    const labels = pipe ? Array.from(pipe.querySelectorAll('.pipe__labels li')) : [];
    const steps = pipe ? Array.from(pipe.querySelectorAll('.step')) : [];
    let activeStep = -1;

    const timeline = document.querySelector('.timeline');
    const rail = document.getElementById('rail');

    function setStep(i) {
      if (i === activeStep) return;
      activeStep = i;
      nodes.forEach((n, k) => {
        n.classList.toggle('is-on', k <= i);
        n.classList.toggle('is-current', k === i);
      });
      labels.forEach((l, k) => l.classList.toggle('is-on', k <= i));
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    }

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const docH = root.scrollHeight - vh;

      if (progress) progress.style.setProperty('--progress', docH > 0 ? (y / docH).toFixed(4) : '0');
      if (nav) nav.classList.toggle('is-scrolled', y > 40);

      if (hero && !reduceMotion) {
        const hp = clamp(y / (hero.offsetHeight * 0.85), 0, 1);
        hero.style.setProperty('--hero-p', hp.toFixed(3));
        if (field) field.setScroll(hp);
      }

      if (scrolly) {
        const r = pipe.getBoundingClientRect();
        const total = Math.max(1, r.height - vh);
        const p = clamp(-r.top / total, 0, 1);
        const fill = clamp(p / 0.86, 0, 1);
        if (pipeFill) pipeFill.style.strokeDashoffset = (1 - fill).toFixed(4);
        setStep(Math.min(4, Math.floor(fill * 4 + 0.03)));
      }

      if (timeline && rail) {
        const tr = timeline.getBoundingClientRect();
        const rp = reduceMotion ? 1 : clamp((vh * 0.65 - tr.top) / tr.height, 0, 1);
        rail.style.setProperty('--rail', rp.toFixed(4));
      }
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (scrolly) setStep(0);
    update();

    // Reveal on scroll, plus the one-shot effects inside each block
    const revealEls = document.querySelectorAll('[data-reveal]');
    const onReveal = (el) => {
      el.classList.add('is-in');
      if (reduceMotion) return;
      el.querySelectorAll('[data-scramble]').forEach(scramble);
      el.querySelectorAll('[data-count]').forEach(countUp);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          onReveal(entry.target);
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('is-in'));
    }

    // Active nav link
    const navLinks = nav ? Array.from(nav.querySelectorAll('.nav__links a[href^="#"]')) : [];
    if ('IntersectionObserver' in window && navLinks.length) {
      const byId = {};
      navLinks.forEach((a) => (byId[a.getAttribute('href').slice(1)] = a));
      const navIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const link = byId[entry.target.id];
          if (link) link.classList.toggle('is-active', entry.isIntersecting);
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(byId).forEach((id) => {
        const s = document.getElementById(id);
        if (s) navIo.observe(s);
      });
    }

    // Pointer effects: spotlight, tilt, magnetic, cursor glow
    document.querySelectorAll('[data-spotlight]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });

    if (finePointer && !reduceMotion) {
      document.querySelectorAll('[data-tilt]').forEach((el) => {
        const wide = el.classList.contains('build--wide');
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          el.classList.add('is-tilting');
          el.style.setProperty('--rx', (-y * (wide ? 4 : 7)).toFixed(2) + 'deg');
          el.style.setProperty('--ry', (x * (wide ? 4 : 8)).toFixed(2) + 'deg');
        });
        el.addEventListener('pointerleave', () => {
          el.classList.remove('is-tilting');
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
        });
      });

      document.querySelectorAll('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          el.style.transform = 'translate3d(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) + 'px,0)';
        });
        el.addEventListener('pointerleave', () => {
          el.style.transform = '';
        });
      });

      const glow = document.querySelector('.cursor-glow');
      if (glow) {
        window.addEventListener('pointermove', (e) => {
          glow.style.setProperty('--cx', e.clientX + 'px');
          glow.style.setProperty('--cy', e.clientY + 'px');
          glow.classList.add('is-on');
        }, { passive: true });
        document.addEventListener('pointerleave', () => glow.classList.remove('is-on'));
      }
    }

    // Ask: suggested questions, and keep the thread pinned to the latest entry
    const askForm = document.getElementById('askForm');
    const askInput = document.getElementById('askInput');
    const askThread = document.getElementById('askThread');
    document.querySelectorAll('.qchip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!askForm || !askInput) return;
        askInput.value = chip.dataset.q || chip.textContent;
        if (typeof askForm.requestSubmit === 'function') askForm.requestSubmit();
        else askForm.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });
    if (askThread && 'MutationObserver' in window) {
      new MutationObserver(() => {
        askThread.scrollTop = askThread.scrollHeight;
      }).observe(askThread, { childList: true, subtree: true, characterData: true });
    }

    // Service worker for offline shell
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/js/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {});
    }
  });
})();
