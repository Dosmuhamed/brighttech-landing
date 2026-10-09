/* ==========================================================
   Bright Tech — landing interactions
   ========================================================== */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  onScrollNav();
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('#navLinks a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    })
  );

  const navMap = new Map();
  document.querySelectorAll('#navLinks a[href^="#"]').forEach((a) => navMap.set(a.getAttribute('href').slice(1), a));
  const sectionObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navMap.forEach((a) => a.classList.remove('active'));
      const link = navMap.get(e.target.id);
      if (link && !link.classList.contains('nav-links-cta')) link.classList.add('active');
    }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  document.querySelectorAll('section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- reveal ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }),
    { threshold: .12, rootMargin: '0px 0px -6% 0px' }
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

  /* ---------- counters ---------- */
  const fmt = (n, sep) => (sep ? n.toLocaleString('ru-RU').replace(/ /g, ' ') : String(n));
  const countObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countObserver.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      const sep = !!el.dataset.sep;
      if (reduceMotion) { el.textContent = fmt(to, sep); return; }
      const dur = 1800;
      const t0 = performance.now();
      const tick = (now) => {
        const t = clamp((now - t0) / dur);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(2, -10 * t))), sep);
        if (t < 1) requestAnimationFrame(tick); else el.textContent = fmt(to, sep);
      };
      requestAnimationFrame(tick);
    }),
    { threshold: .6 }
  );
  document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

  /* ---------- spotlight cards ---------- */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ==========================================================
     HERO — isometric city that builds itself
     ========================================================== */
  (function city() {
    const canvas = document.getElementById('city');
    const wrap = document.getElementById('heroVisual');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COS = Math.cos(Math.PI / 6);
    const SIN = 0.5;
    const FH = 0.5; // floor height in world units

    // footprints on the ground plane (x, y), size (w, d), floors f
    const towers = [
      { x: 0.6, y: -3.6, w: 2.4, d: 2.2, f: 8, delay: 0.35 },
      { x: -3.6, y: 0.6, w: 2.4, d: 2.2, f: 6, delay: 0.5 },
      { x: 0, y: 0, w: 3, d: 3, f: 15, delay: 0 },
      { x: 4, y: 0.2, w: 2.4, d: 2.4, f: 9, delay: 0.2, crane: true },
      { x: 0.2, y: 4, w: 2.6, d: 2.4, f: 7, delay: 0.25 },
      { x: 3.8, y: 3.8, w: 2.2, d: 2.2, f: 4, delay: 0.45 },
    ];

    // deterministic pseudo-random
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    // windows: precomputed per tower / floor / face
    towers.forEach((t) => {
      t.windows = [];
      for (let k = 0; k < t.f; k++) {
        const nr = Math.max(2, Math.round(t.d / 0.62));
        const nl = Math.max(2, Math.round(t.w / 0.62));
        for (let i = 0; i < nr; i++) t.windows.push({ face: 'r', k, u: (i + 0.5) / nr, ph: rnd() * 100, sp: 0.25 + rnd() * 0.6, hot: rnd() < 0.1 });
        for (let i = 0; i < nl; i++) t.windows.push({ face: 'l', k, u: (i + 0.5) / nl, ph: rnd() * 100, sp: 0.25 + rnd() * 0.6, hot: rnd() < 0.1 });
      }
      t.pulse = { ph: rnd(), sp: 0.12 + rnd() * 0.1 };
    });
    const maxZ = Math.max(...towers.map((t) => t.f)) * FH;

    // ground "streets" with flowing data particles
    const traces = [
      [[3.5, -8], [3.5, 3.5]],
      [[-8, 3.4], [3.5, 3.4]],
      [[-0.6, -8], [-0.6, -0.6], [-8, -0.6]],
      [[3.5, 3.5], [3.5, 10]],
      [[3.5, 3.5], [10, 3.5]],
    ].map((pts) => {
      let len = 0;
      const segs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const l = Math.hypot(bx - ax, by - ay);
        segs.push({ ax, ay, bx, by, l, s: len });
        len += l;
      }
      return { pts, segs, len };
    });
    const particles = [];
    traces.forEach((tr, i) => {
      for (let k = 0; k < 3; k++) particles.push({ tr, o: rnd(), sp: 0.04 + rnd() * 0.05, hot: (i + k) % 5 === 0 });
    });
    const pointOn = (tr, d) => {
      for (const s of tr.segs) {
        if (d <= s.s + s.l) {
          const t = (d - s.s) / s.l;
          return [lerp(s.ax, s.bx, t), lerp(s.ay, s.by, t)];
        }
      }
      const last = tr.segs[tr.segs.length - 1];
      return [last.bx, last.by];
    };

    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    let mx = 0, my = 0, pmx = 0, pmy = 0;

    const P = (x, y, z) => [
      ox + pmx + (x - y) * COS * scale,
      oy + pmy + ((x + y) * SIN - z) * scale,
    ];

    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // fit bounding box of all towers + crane
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const add = (x, y, z) => {
        const sx = (x - y) * COS, sy = (x + y) * SIN - z;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      };
      towers.forEach((t) => {
        const h = t.f * FH;
        [[t.x, t.y], [t.x + t.w, t.y], [t.x, t.y + t.d], [t.x + t.w, t.y + t.d]].forEach(([x, y]) => { add(x, y, 0); add(x, y, h); });
        if (t.crane) add(t.x + t.w / 2, t.y + t.d / 2, h + FH + 3.4);
      });
      const bw = maxX - minX, bh = maxY - minY;
      scale = Math.min((W * 0.84) / bw, (H * 0.78) / bh);
      ox = W / 2 - ((minX + maxX) / 2) * scale;
      oy = H / 2 - ((minY + maxY) / 2) * scale + H * 0.03;
    }

    function quad(a, b, c, d) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      ctx.closePath();
    }
    function line(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

    function drawGround(t) {
      // dot grid
      for (let gx = -8; gx <= 10; gx++) {
        for (let gy = -8; gy <= 10; gy++) {
          const dist = Math.hypot(gx - 1.5, gy - 1.5);
          const a = clamp(1 - dist / 9.5) * 0.35;
          if (a <= 0.01) continue;
          const p = P(gx, gy, 0);
          ctx.fillStyle = `rgba(143,212,247,${a})`;
          ctx.fillRect(p[0] - 0.75, p[1] - 0.75, 1.5, 1.5);
        }
      }
      // streets
      ctx.lineWidth = 1;
      traces.forEach((tr) => {
        ctx.strokeStyle = 'rgba(143,212,247,0.10)';
        ctx.beginPath();
        tr.pts.forEach(([x, y], i) => { const p = P(x, y, 0); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.stroke();
      });
      // particles
      particles.forEach((pt) => {
        const prog = (pt.o + t * pt.sp) % 1;
        const d = prog * pt.tr.len;
        const [x, y] = pointOn(pt.tr, d);
        const [tx, ty] = pointOn(pt.tr, Math.max(0, d - 1.2));
        const fade = Math.sin(prog * Math.PI);
        const head = P(x, y, 0), tail = P(tx, ty, 0);
        const col = pt.hot ? '242,122,46' : '143,212,247';
        const g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
        g.addColorStop(0, `rgba(${col},0)`);
        g.addColorStop(1, `rgba(${col},${0.8 * fade})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        line(tail, head);
        ctx.fillStyle = `rgba(${col},${fade})`;
        ctx.beginPath(); ctx.arc(head[0], head[1], 1.8, 0, Math.PI * 2); ctx.fill();
      });
      // footprint glows
      towers.forEach((tw) => {
        const pad = 0.35;
        quad(P(tw.x - pad, tw.y - pad, 0), P(tw.x + tw.w + pad, tw.y - pad, 0), P(tw.x + tw.w + pad, tw.y + tw.d + pad, 0), P(tw.x - pad, tw.y + tw.d + pad, 0));
        ctx.fillStyle = 'rgba(76,179,232,0.05)';
        ctx.fill();
      });
    }

    function drawBox(tw, z0, z1, mode) {
      const { x, y, w, d } = tw;
      const A = P(x, y + d, z0), B = P(x + w, y + d, z0), C = P(x + w, y, z0);
      const A1 = P(x, y + d, z1), B1 = P(x + w, y + d, z1), C1 = P(x + w, y, z1), D1 = P(x, y, z1);
      if (mode === 'solid') {
        // left face (+y)
        quad(A, B, B1, A1);
        const gl = ctx.createLinearGradient(A1[0], A1[1], A[0], A[1]);
        gl.addColorStop(0, 'rgba(22,33,86,0.96)'); gl.addColorStop(1, 'rgba(11,17,52,0.96)');
        ctx.fillStyle = gl; ctx.fill();
        // right face (+x)
        quad(B, C, C1, B1);
        const gr = ctx.createLinearGradient(C1[0], C1[1], C[0], C[1]);
        gr.addColorStop(0, 'rgba(34,50,118,0.96)'); gr.addColorStop(1, 'rgba(16,25,70,0.96)');
        ctx.fillStyle = gr; ctx.fill();
        // top
        quad(A1, B1, C1, D1);
        ctx.fillStyle = 'rgba(52,80,170,0.55)'; ctx.fill();
      }
      // outline
      ctx.strokeStyle = mode === 'ghost' ? 'rgba(242,162,94,0.75)' : 'rgba(143,212,247,0.55)';
      ctx.lineWidth = 1;
      if (mode === 'ghost') ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(A1[0], A1[1]); ctx.lineTo(B1[0], B1[1]); ctx.lineTo(C1[0], C1[1]); ctx.lineTo(D1[0], D1[1]); ctx.closePath();
      ctx.moveTo(A[0], A[1]); ctx.lineTo(A1[0], A1[1]);
      ctx.moveTo(B[0], B[1]); ctx.lineTo(B1[0], B1[1]);
      ctx.moveTo(C[0], C[1]); ctx.lineTo(C1[0], C1[1]);
      ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawTower(tw, t, floorsShown) {
      const built = Math.floor(floorsShown);
      const frac = floorsShown - built;
      const Hh = built * FH;
      if (built > 0) {
        drawBox(tw, 0, Hh, 'solid');
        // floor lines
        ctx.strokeStyle = 'rgba(143,212,247,0.10)';
        ctx.lineWidth = 1;
        for (let k = 1; k < built; k++) {
          const z = k * FH;
          ctx.beginPath();
          const a = P(tw.x, tw.y + tw.d, z), b = P(tw.x + tw.w, tw.y + tw.d, z), c = P(tw.x + tw.w, tw.y, z);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
          ctx.stroke();
        }
        // windows
        const scanZ = ((t * 0.12) % 1.6) * maxZ * 1.1;
        tw.windows.forEach((wd) => {
          if (wd.k >= built) return;
          const zc = (wd.k + 0.5) * FH;
          let b = Math.pow(Math.max(0, Math.sin(t * wd.sp + wd.ph)), 18);
          b += Math.exp(-Math.pow(zc - scanZ, 2) / 0.18) * 0.35;
          const a = 0.07 + b * 0.85;
          const col = wd.hot ? '255,162,94' : '143,212,247';
          ctx.fillStyle = `rgba(${col},${clamp(a)})`;
          const hw = 0.12, hz = 0.12;
          if (wd.face === 'r') {
            const yy = tw.y + wd.u * tw.d, xx = tw.x + tw.w;
            quad(P(xx, yy - hw, zc - hz), P(xx, yy + hw, zc - hz), P(xx, yy + hw, zc + hz), P(xx, yy - hw, zc + hz));
          } else {
            const xx = tw.x + wd.u * tw.w, yy = tw.y + tw.d;
            quad(P(xx - hw, yy, zc - hz), P(xx + hw, yy, zc - hz), P(xx + hw, yy, zc + hz), P(xx - hw, yy, zc + hz));
          }
          ctx.fill();
        });
        // data pulse climbing the front edge
        const pp = (tw.pulse.ph + t * tw.pulse.sp) % 1;
        const ep = P(tw.x + tw.w, tw.y + tw.d, pp * Hh);
        const ga = Math.sin(pp * Math.PI);
        const grd = ctx.createRadialGradient(ep[0], ep[1], 0, ep[0], ep[1], 9);
        grd.addColorStop(0, `rgba(143,212,247,${0.9 * ga})`);
        grd.addColorStop(1, 'rgba(143,212,247,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(ep[0], ep[1], 9, 0, Math.PI * 2); ctx.fill();
      }
      // the floor that is being placed right now drops in from above
      if (frac > 0.001) {
        const drop = (1 - easeOut(frac)) * 2.2;
        ctx.globalAlpha = frac;
        drawBox(tw, Hh + drop, Hh + drop + FH, 'solid');
        ctx.globalAlpha = 1;
      }
      // permanent "under construction" floor for the crane tower
      if (tw.crane && built === tw.f) drawBox(tw, Hh, Hh + FH, 'ghost');
    }

    function drawCrane(tw, t, appear) {
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      const top = tw.f * FH + FH;
      const bx = tw.x + tw.w * 0.5, by = tw.y + tw.d * 0.5;
      const mastH = 3.1;
      const zj = top + mastH;
      ctx.strokeStyle = 'rgba(190,228,250,0.75)';
      ctx.lineWidth = 1;
      // lattice mast
      const m = 0.16;
      const l1 = [bx - m, by + m], l2 = [bx + m, by + m], l3 = [bx + m, by - m];
      [l1, l2, l3].forEach(([x, y]) => line(P(x, y, top), P(x, y, zj)));
      ctx.strokeStyle = 'rgba(190,228,250,0.35)';
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const z0 = top + (mastH / steps) * i, z1 = top + (mastH / steps) * (i + 1);
        line(P(l1[0], l1[1], z0), P(l2[0], l2[1], z1));
        line(P(l2[0], l2[1], z0), P(l3[0], l3[1], z1));
      }
      // rotating jib
      const ang = -2.2 + Math.sin(t * 0.16) * 0.75;
      const cx = Math.cos(ang), cy = Math.sin(ang);
      const jibEnd = [bx + cx * 4.4, by + cy * 4.4];
      const cEnd = [bx - cx * 1.5, by - cy * 1.5];
      ctx.strokeStyle = 'rgba(190,228,250,0.85)';
      ctx.lineWidth = 1.4;
      line(P(cEnd[0], cEnd[1], zj), P(jibEnd[0], jibEnd[1], zj));
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(190,228,250,0.4)';
      const peak = P(bx, by, zj + 0.9);
      line(peak, P(bx + cx * 3, by + cy * 3, zj));
      line(peak, P(cEnd[0], cEnd[1], zj));
      // counterweight
      const cw = P(cEnd[0], cEnd[1], zj);
      ctx.fillStyle = 'rgba(190,228,250,0.6)';
      ctx.fillRect(cw[0] - 4, cw[1] - 1, 8, 6);
      // trolley + hook + glowing load (the "orange dot")
      const r = 2.6 + Math.sin(t * 0.23) * 1.0;
      const tx = bx + cx * r, ty = by + cy * r;
      const hookZ = zj - 1.6 - (Math.sin(t * 0.37) + 1) * 0.9;
      const tp = P(tx, ty, zj), hp = P(tx, ty, hookZ);
      ctx.strokeStyle = 'rgba(190,228,250,0.55)';
      line(tp, hp);
      const glow = ctx.createRadialGradient(hp[0], hp[1] + 6, 0, hp[0], hp[1] + 6, 22);
      glow.addColorStop(0, 'rgba(242,122,46,0.55)');
      glow.addColorStop(1, 'rgba(242,122,46,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(hp[0], hp[1] + 6, 22, 0, Math.PI * 2); ctx.fill();
      const s = 0.22;
      quad(P(tx - s, ty - s, hookZ - 0.05), P(tx + s, ty - s, hookZ - 0.05), P(tx + s, ty + s, hookZ - 0.05), P(tx - s, ty + s, hookZ - 0.05));
      ctx.fillStyle = '#f27a2e'; ctx.fill();
      quad(P(tx - s, ty + s, hookZ - 0.05), P(tx + s, ty + s, hookZ - 0.05), P(tx + s, ty + s, hookZ - 0.45), P(tx - s, ty + s, hookZ - 0.45));
      ctx.fillStyle = '#c95a17'; ctx.fill();
      quad(P(tx + s, ty - s, hookZ - 0.05), P(tx + s, ty + s, hookZ - 0.05), P(tx + s, ty + s, hookZ - 0.45), P(tx + s, ty - s, hookZ - 0.45));
      ctx.fillStyle = '#e06a22'; ctx.fill();
      ctx.globalAlpha = 1;
    }

    const BUILD = 2.4;
    function render(t) {
      ctx.clearRect(0, 0, W, H);
      pmx = lerp(pmx, mx * 14, 0.05);
      pmy = lerp(pmy, my * 9, 0.05);
      drawGround(t);
      let craneAppear = 0, craneTower = null;
      towers.forEach((tw) => {
        const p = clamp((t - 0.15 - tw.delay) / BUILD);
        const shown = easeInOut(p) * tw.f;
        drawTower(tw, t, shown);
        if (tw.crane) { craneTower = tw; craneAppear = clamp((t - 0.15 - tw.delay - BUILD) / 0.8); }
      });
      if (craneTower) drawCrane(craneTower, t, craneAppear);
    }

    resize();
    window.addEventListener('resize', () => { resize(); if (reduceMotion) render(30); });

    if (reduceMotion) {
      render(30);
      wrap.classList.add('ready');
      return;
    }

    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    wrap.addEventListener('pointerleave', () => { mx = 0; my = 0; });

    let running = false, raf = 0, start = null, elapsed = 0, last = 0;
    const loop = (now) => {
      if (start === null) { start = now; last = now; }
      elapsed += Math.min(250, now - last) / 1000;
      last = now;
      render(elapsed);
      raf = requestAnimationFrame(loop);
    };
    const play = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame((n) => { last = n; loop(n); }); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop())).observe(wrap);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
    setTimeout(() => wrap.classList.add('ready'), 400);
  })();

  /* ==========================================================
     Scroll-linked effects: chaos → order, chain
     ========================================================== */
  const chaos = document.getElementById('chaos');
  const chips = chaos ? [...chaos.querySelectorAll('.chip')] : [];
  const chaosState = chaos && chaos.querySelector('.chaos-state');
  let seed2 = 11;
  const rnd2 = () => ((seed2 = (seed2 * 16807) % 2147483647) / 2147483647);
  chips.forEach((c) => {
    c._dx = (rnd2() * 2 - 1) * 46;
    c._dy = (rnd2() * 2 - 1) * 34;
    c._r = (rnd2() * 2 - 1) * 26;
  });

  function updateChaos(vh) {
    if (!chaos) return;
    const r = chaos.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    let p = clamp((vh * 0.92 - r.top) / (vh * 0.5));
    if (reduceMotion) p = 1;
    const e = easeInOut(p);
    chips.forEach((c) => {
      const k = 1 - e;
      c.style.transform = `translate(${c._dx * k}%, ${c._dy * k}%) rotate(${c._r * k}deg)`;
    });
    chaos.style.setProperty('--p', e.toFixed(3));
    const ordered = p > 0.97;
    if (ordered !== chaos.classList.contains('ordered')) {
      chaos.classList.toggle('ordered', ordered);
      chaosState.textContent = ordered ? chaosState.dataset.on : chaosState.dataset.off;
    }
  }

  // chain path
  const chain = document.getElementById('chain');
  const chainBase = document.getElementById('chainBase');
  const chainProg = document.getElementById('chainProg');
  const chainDot = document.getElementById('chainDot');
  const chainPct = document.getElementById('chainPct');
  const nodes = chain ? [...chain.querySelectorAll('.node')] : [];
  let chainLen = 0, nodeAt = [];

  function buildChain() {
    if (!chain) return;
    const cr = chain.getBoundingClientRect();
    const pts = nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.left - cr.left + r.width / 2, r.top - cr.top + r.height / 2];
    });
    const singleColumn = pts.every((p) => Math.abs(p[0] - pts[0][0]) < 4);
    if (singleColumn) pts.forEach((p) => (p[0] = 12));
    let d = `M${pts[0][0]},${pts[0][1]}`;
    const partial = [d];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (Math.abs(y1 - y0) < 10 || Math.abs(x1 - x0) < 4) d += ` L${x1},${y1}`;
      else { const ym = (y0 + y1) / 2; d += ` C${x0},${ym} ${x1},${ym} ${x1},${y1}`; }
      partial.push(d);
    }
    const grad = document.getElementById('chainGrad');
    grad.setAttribute('x2', singleColumn ? 0 : cr.width);
    grad.setAttribute('y2', singleColumn ? cr.height : 0);
    chainBase.setAttribute('d', d);
    chainProg.setAttribute('d', d);
    chainLen = chainProg.getTotalLength();
    // cumulative length at each node
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chainBase.parentNode.appendChild(tmp);
    nodeAt = partial.map((pd) => { tmp.setAttribute('d', pd); return tmp.getTotalLength(); });
    tmp.remove();
    chainProg.style.strokeDasharray = `${chainLen}`;
  }

  function updateChain(vh) {
    if (!chain || !chainLen) return;
    const r = chain.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    let p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.4));
    if (reduceMotion) p = 1;
    const L = chainLen * p;
    chainProg.style.strokeDashoffset = `${chainLen - L}`;
    const pt = chainProg.getPointAtLength(Math.max(0.01, L));
    chainDot.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    chainDot.style.opacity = p > 0.001 ? 1 : 0.4;
    nodes.forEach((n, i) => n.classList.toggle('on', L >= nodeAt[i] - 2));
    chainPct.textContent = Math.round(p * 100);
  }

  let ticking = false;
  const onScroll = () => {
    onScrollNav();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight;
      updateChaos(vh);
      updateChain(vh);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  const relayout = () => { buildChain(); onScroll(); };
  window.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
  relayout();

  /* ==========================================================
     Tempo Build — modules highlight widgets
     ========================================================== */
  const app = document.getElementById('app');
  const widgets = app ? [...app.querySelectorAll('.w')] : [];
  const mods = [...document.querySelectorAll('.mod')];
  let pinned = null;
  const focus = (mod) => {
    mods.forEach((m) => m.classList.toggle('on', m === mod));
    if (!mod) { app.classList.remove('focus'); widgets.forEach((w) => w.classList.remove('hl')); return; }
    app.classList.add('focus');
    widgets.forEach((w) => w.classList.toggle('hl', w.dataset.w === mod.dataset.w));
  };
  mods.forEach((m) => {
    m.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focus(m); });
    m.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(pinned); });
    m.addEventListener('focus', () => focus(m));
    m.addEventListener('blur', () => focus(pinned));
    m.addEventListener('click', () => { pinned = pinned === m ? null : m; focus(pinned); });
  });

  /* ==========================================================
     AI chat — typed conversation
     ========================================================== */
  (function chatDemo() {
    const chatEl = document.getElementById('chat');
    if (!chatEl) return;
    const input = document.getElementById('chatInput');
    const user = document.getElementById('msgUser');
    const typing = document.getElementById('msgTyping');
    const bot = document.getElementById('msgBot');
    const src = document.getElementById('msgSrc');
    const question = 'Сколько осталось оплатить по договору №214 с ТОО «Монолит-Строй»?';
    const answer = 'По договору №214 закрыто актами **142,1 млн ₸**, оплачено **128,9 млн ₸**. К оплате по подписанным КС-2 — **13,2 млн ₸**. !!⚠ В акте №7 не зачтён аванс 4,2 млн ₸ — рекомендую скорректировать до согласования.!!';

    // tokenise into words wrapped in their styles
    const tokens = [];
    answer.split(/(\*\*[^*]+\*\*|!![^!]+!!)/).filter(Boolean).forEach((chunk) => {
      let tag = null, text = chunk;
      if (chunk.startsWith('**')) { tag = 'b'; text = chunk.slice(2, -2); }
      else if (chunk.startsWith('!!')) { tag = 'warn'; text = chunk.slice(2, -2); }
      text.split(/(\s+)/).filter(Boolean).forEach((w) => {
        if (/^\s+$/.test(w)) tokens.push(w);
        else if (tag === 'b') tokens.push(`<b>${w}</b>`);
        else if (tag === 'warn') tokens.push(`<span class="warn">${w}</span>`);
        else tokens.push(w);
      });
    });
    const finalHtml = tokens.join('');

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function run() {
      if (reduceMotion) {
        user.textContent = question; user.classList.add('show');
        bot.innerHTML = finalHtml; bot.classList.add('show');
        src.classList.add('show');
        return;
      }
      await wait(500);
      input.classList.remove('chat-placeholder');
      input.classList.add('typing');
      input.textContent = '';
      for (const ch of question) { input.textContent += ch; await wait(28 + Math.random() * 30); }
      await wait(350);
      input.classList.remove('typing');
      input.classList.add('chat-placeholder');
      input.textContent = 'Спросите о договоре, акте или платеже…';
      user.textContent = question;
      user.classList.add('show');
      await wait(450);
      typing.classList.add('show');
      await wait(1500);
      typing.classList.remove('show');
      bot.classList.add('show');
      let html = '';
      for (const tk of tokens) { html += tk; bot.innerHTML = html; if (!/^\s+$/.test(tk)) await wait(45); }
      await wait(300);
      src.classList.add('show');
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { threshold: .45 });
    io.observe(chatEl);
  })();

  /* ==========================================================
     Contact form → prepared email
     ========================================================== */
  const form = document.getElementById('form');
  const note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      ['name', 'phone'].forEach((n) => {
        const f = form.elements[n];
        const bad = !f.value.trim();
        f.closest('.field').classList.toggle('err', bad);
        if (bad) ok = false;
      });
      if (!ok) { note.textContent = 'Заполните имя и контакт для связи'; note.classList.remove('ok'); return; }
      const pains = [...form.querySelectorAll('#choice input:checked')].map((i) => i.value);
      const body = [
        `Имя: ${form.elements.name.value.trim()}`,
        `Компания: ${form.elements.company.value.trim() || '—'}`,
        `Контакт: ${form.elements.phone.value.trim()}`,
        `Что болит: ${pains.length ? pains.join(', ') : '—'}`,
      ].join('\n');
      window.location.href = `mailto:sales@brighttech.pro?subject=${encodeURIComponent('Заявка на экспресс-аудит')}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Готово! Письмо подготовлено в вашем почтовом клиенте.';
      note.classList.add('ok');
    });
    form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('err'); });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
