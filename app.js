/* ==========================================================================
   PERSIANAS ZAPOTLÁN · app.js
   JavaScript vanilla, sin dependencias obligatorias (Lenis es opcional).
   Módulos: núcleo · loader · scroll · navegación · reveal · hero (persiana en vivo + polvo)
            manifiesto · explorador de luz · colección · proceso · galería · FAQ · formulario · extras
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const pad2 = (n) => String(n).padStart(2, '0');
  const rand = (a, b) => a + Math.random() * (b - a);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const WA_NUMBER = '523411057793';
  const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  /** Ejecuta un módulo aislado: si falla, el resto de la página sigue funcionando. */
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[Persianas] módulo "${name}":`, err); }
  };

  /* Estado compartido de scroll + tareas por frame */
  const S = { y: 0, vel: 0, dir: 1, vh: window.innerHeight, vw: window.innerWidth };
  const scrollTasks = [];   // (y, t) => void   — se ejecutan cada frame
  const frameTasks = [];    // (t) => void
  let lenis = null;
  let navHeight = 68;

  /* ---------- 0. Enlaces de WhatsApp con mensaje prellenado ---------- */
  safe('whatsapp', () => {
    $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa); });
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  });

  /* ---------- 1. Scroll suave (Lenis, opcional) + bucle principal ---------- */
  safe('smooth-scroll', () => {
    if (reduced || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.3
    });
    lenis.stop(); // se reactiva cuando termina el loader
  });

  const lockScroll = (on) => {
    doc.classList.toggle('is-locked', on);
    if (lenis) (on ? lenis.stop() : lenis.start());
  };
  lockScroll(true);

  function frame(t) {
    if (lenis) lenis.raf(t);
    const y = window.scrollY;
    S.vel = y - S.y;
    if (S.vel !== 0) S.dir = S.vel > 0 ? 1 : -1;
    S.y = y;
    for (let i = 0; i < scrollTasks.length; i++) scrollTasks[i](y, t);
    for (let i = 0; i < frameTasks.length; i++) frameTasks[i](t);
    requestAnimationFrame(frame);
  }

  /* Anclas internas: desplazamiento suave con Lenis o nativo */
  const scrollToTarget = (target, immediate = false) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: immediate ? 0 : 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (id === '#inicio') { lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else scrollToTarget(target);
    try { history.replaceState(null, '', id); } catch (_) { /* file:// */ }
  });

  /* ---------- 2. Loader / spinner de carga ---------- */
  function runLoader(onDone) {
    const loader = $('#loader');
    const pctEl = $('#loaderPct');
    const barEl = $('#loaderBar');
    if (!loader || reduced) { if (loader) loader.remove(); lockScroll(false); onDone(); return; }

    const MIN = 2600;            // duración mínima para que se aprecie la marca
    const t0 = performance.now();
    let ready = false;
    let shown = 0;
    let finished = false;

    const pageLoaded = new Promise((res) => (document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true })));
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([pageLoaded, fontsReady]).then(() => { ready = true; });
    setTimeout(() => { ready = true; }, 6500); // red-seguro: nunca bloquear al usuario

    const finish = () => {
      if (finished) return;
      finished = true;
      loader.classList.add('is-done');
      setTimeout(onDone, 520);                    // el hero empieza mientras las lamas se abren
      setTimeout(() => lockScroll(false), 900);
      setTimeout(() => loader.remove(), 2100);
    };

    (function tick(now) {
      const el = now - t0;
      const timeP = clamp(el / MIN);
      const eased = 1 - Math.pow(1 - timeP, 2.2);
      const target = ready ? eased : Math.min(eased, 0.9);
      shown += (target - shown) * 0.12;
      const pct = Math.min(100, Math.round(shown * 100));
      if (pctEl) pctEl.textContent = pct;
      if (barEl) barEl.style.transform = `scaleX(${shown})`;
      if (ready && el >= MIN && shown > 0.992) {
        if (pctEl) pctEl.textContent = '100';
        if (barEl) barEl.style.transform = 'scaleX(1)';
        setTimeout(finish, 280);
        return;
      }
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- 3. Navegación ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#menu');

  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    doc.classList.add('menu-open');
    lockScroll(true);
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    doc.classList.remove('menu-open');
    lockScroll(false);
  }

  safe('nav', () => {
    if (!nav) return;
    $$('[data-menu-link]').forEach((a, i) => a.style.setProperty('--k', i));
    burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });

    const links = $$('[data-nav]');
    const sections = links.map((a) => $(a.getAttribute('href')));
    let current = -1;

    scrollTasks.push((y) => {
      nav.classList.toggle('is-scrolled', y > 24);
      const hide = S.dir > 0 && y > 480 && !doc.classList.contains('menu-open');
      const show = S.dir < 0 || y < 480;
      if (hide) nav.classList.add('is-hidden');
      else if (show) nav.classList.remove('is-hidden');

      // enlace de la sección actual
      let idx = -1;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (!s) continue;
        const r = s.getBoundingClientRect();
        if (r.top <= S.vh * 0.4 && r.bottom > S.vh * 0.4) { idx = i; break; }
      }
      if (idx !== current) {
        current = idx;
        links.forEach((a, i) => a.classList.toggle('is-current', i === idx));
      }
    });
    navHeight = nav.offsetHeight || navHeight;
  });

  /* Barra de progreso de lectura */
  safe('progress', () => {
    const bar = $('#progressBar');
    if (!bar) return;
    let last = -1;
    scrollTasks.push((y) => {
      const max = doc.scrollHeight - S.vh;
      const p = max > 0 ? clamp(y / max) : 0;
      if (Math.abs(p - last) > 0.0008) { bar.style.transform = `scaleX(${p})`; last = p; }
    });
  });

  /* ---------- 4. Reveal + titulares palabra por palabra ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.textContent = part; wi.style.setProperty('--wi', i++);
            w.appendChild(wi); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  }

  safe('reveal', () => {
    $$('[data-split]').forEach(splitWords);

    const items = $$('[data-reveal], [data-split]:not([data-split="hero"]), [data-reveal-blinds]');
    $$('[data-reveal-blinds]').forEach((fig, i) => {
      fig.style.setProperty('--delay', `${(i % 3) * 0.14}s`);
      const btn = $('.g-item__btn', fig);
      btn.addEventListener('transitionend', (e) => { if (e.propertyName === '--p') fig.classList.add('is-done'); });
    });

    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach((el) => el.classList.add('is-in', 'is-done'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
    items.forEach((el) => io.observe(el));
  });

  /* ---------- 5. HERO · persiana Día y Noche en vivo ---------- */
  const heroState = { visible: true, ptr: { x: 0, y: 0, nx: 0, ny: 0, inside: false } };

  safe('hero-window', () => {
    const hero = $('#inicio');
    const win = $('#heroWin');
    const wrap = $('#winWrap');
    const zebra = $('#heroZebra');
    const range = $('#heroRange');
    const hudL = $('#hudLight');
    const hudP = $('#hudPrivacy');
    const copy = $('.hero__copy');
    if (!hero || !win || !zebra) return;

    // Ciclo de luz del día (variables CSS animadas por JS)
    const KEYS = [
      { p: 0.00, t: [246, 201, 160], b: [252, 235, 211], sx: 16, sy: 80, so: .9, mx: 30, my: 60, mo: 0, st: 0,  hb: .9,  co: .85 },
      { p: 0.20, t: [143, 195, 232], b: [234, 244, 251], sx: 44, sy: 22, so: 1,  mx: 40, my: 40, mo: 0, st: 0,  hb: 1,   co: .9 },
      { p: 0.45, t: [120, 176, 224], b: [236, 243, 248], sx: 72, sy: 30, so: 1,  mx: 50, my: 40, mo: 0, st: 0,  hb: 1,   co: .9 },
      { p: 0.62, t: [242, 166, 107], b: [255, 217, 160], sx: 88, sy: 66, so: 1,  mx: 60, my: 50, mo: 0, st: 0,  hb: .85, co: .8 },
      { p: 0.72, t: [92,  72, 128],  b: [226, 142, 112], sx: 98, sy: 92, so: .35, mx: 66, my: 40, mo: 0, st: .25, hb: .55, co: .55 },
      { p: 0.80, t: [22,  28,  62],  b: [70,  70, 116],  sx: 100, sy: 110, so: 0, mx: 72, my: 28, mo: 1, st: 1,  hb: .42, co: .3 },
      { p: 0.92, t: [18,  22,  52],  b: [52,  56, 102],  sx: 100, sy: 110, so: 0, mx: 60, my: 24, mo: 1, st: 1,  hb: .38, co: .25 },
      { p: 1.00, t: [246, 201, 160], b: [252, 235, 211], sx: 16, sy: 80, so: .9, mx: 30, my: 60, mo: 0, st: 0,  hb: .9,  co: .85 }
    ];
    const mixArr = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], k)));
    const sceneAt = (p) => {
      let i = 0;
      while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
      const a = KEYS[i], b = KEYS[i + 1];
      const k = smooth(clamp((p - a.p) / (b.p - a.p)));
      const L = (x) => lerp(a[x], b[x], k);
      return { t: mixArr(a.t, b.t, k), b: mixArr(a.b, b.b, k), sx: L('sx'), sy: L('sy'), so: L('so'), mx: L('mx'), my: L('my'), mo: L('mo'), st: L('st'), hb: L('hb'), co: L('co') };
    };

    let o = 0;                // cierre actual de la persiana (0 = luz · 1 = privacidad)
    let userO = null;         // valor impuesto por el usuario
    let lastUser = 0;
    let rangeActive = false;
    let lastL = -1, lastP = -1, lastRangeVal = -1, sceneTick = 0, heroStart = 0;
    let rx = 0, ry = 0, tx = 0, ty = 0;       // tilt actual / objetivo

    const setRangeVisual = (v) => { range.style.setProperty('--pct', `${v}%`); };

    range.addEventListener('input', () => {
      userO = clamp(range.value / 100); lastUser = performance.now(); setRangeVisual(range.value);
    });
    ['pointerdown', 'touchstart'].forEach((ev) => range.addEventListener(ev, () => { rangeActive = true; }, { passive: true }));
    ['pointerup', 'pointercancel', 'touchend', 'blur'].forEach((ev) => range.addEventListener(ev, () => { rangeActive = false; lastUser = performance.now(); }));

    // Arrastrar la persiana con el mouse
    if (finePointer) {
      let dragging = false, startY = 0, startO = 0;
      wrap.style.cursor = 'ns-resize';
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.chip')) return;
        dragging = true; startY = e.clientY; startO = o; wrap.setPointerCapture(e.pointerId);
      });
      wrap.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        userO = clamp(startO + (e.clientY - startY) / (win.offsetHeight * 0.7)); lastUser = performance.now();
      });
      const end = (e) => { if (!dragging) return; dragging = false; lastUser = performance.now(); try { wrap.releasePointerCapture(e.pointerId); } catch (_) {} };
      wrap.addEventListener('pointerup', end);
      wrap.addEventListener('pointercancel', end);
    }

    // Pausar cuando el hero no es visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { heroState.visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      heroState.ptr.x = e.clientX - r.left; heroState.ptr.y = e.clientY - r.top;
      heroState.ptr.nx = (e.clientX / S.vw - .5); heroState.ptr.ny = (e.clientY / S.vh - .5);
      heroState.ptr.inside = r.bottom > 0 && r.top < S.vh;
    }, { passive: true });

    frameTasks.push((t) => {
      if (!heroState.visible) return;
      const now = t;

      // el ciclo arranca cuando el hero se hace visible (persiana abierta → luz a la vista)
      if (!heroStart && doc.classList.contains('is-ready')) heroStart = now;
      const ct = heroStart ? (now - heroStart) / 1000 : 0;

      // objetivo de la persiana: usuario o ciclo automático (con pausas en los extremos)
      let target;
      if (userO !== null && now - lastUser > 4500 && !rangeActive) userO = null;
      if (userO !== null) target = userO;
      else target = smooth(clamp(0.5 + 0.75 * Math.sin(ct * (Math.PI * 2 / 12) - Math.PI / 2)));
      o += (target - o) * (userO !== null ? 0.22 : 0.08);
      zebra.style.setProperty('--o', o.toFixed(4));

      // slider sigue a la persiana cuando no lo toca el usuario
      if (!rangeActive && userO === null) {
        const v = Math.round(o * 100);
        if (v !== lastRangeVal) { range.value = v; setRangeVisual(v); lastRangeVal = v; }
      }

      // HUD
      const light = Math.round(lerp(58, 5, o));
      const priv = Math.round(lerp(18, 100, o));
      if (light !== lastL) { hudL.textContent = `${light}%`; lastL = light; }
      if (priv !== lastP) { hudP.textContent = `${priv}%`; lastP = priv; }

      // ciclo de cielo (cada 2 frames)
      if ((sceneTick++ & 1) === 0) {
        const sc = sceneAt((ct / 44 + 0.16) % 1);
        const st = win.style;
        st.setProperty('--sky-top', `rgb(${sc.t})`);
        st.setProperty('--sky-bot', `rgb(${sc.b})`);
        st.setProperty('--sun-x', `${sc.sx.toFixed(1)}%`);
        st.setProperty('--sun-y', `${sc.sy.toFixed(1)}%`);
        st.setProperty('--sun-o', sc.so.toFixed(3));
        st.setProperty('--moon-x', `${sc.mx.toFixed(1)}%`);
        st.setProperty('--moon-y', `${sc.my.toFixed(1)}%`);
        st.setProperty('--moon-o', sc.mo.toFixed(3));
        st.setProperty('--star-o', sc.st.toFixed(3));
        st.setProperty('--hill-b', sc.hb.toFixed(3));
        st.setProperty('--cloud-o', sc.co.toFixed(3));
      }

      // tilt 3D con el puntero + parallax de scroll
      if (finePointer && heroState.ptr.inside) { tx = heroState.ptr.ny * -7; ty = heroState.ptr.nx * 11; } else { tx = 0; ty = 0; }
      rx += (tx - rx) * 0.06; ry += (ty - ry) * 0.06;
      const py = S.y * 0.1;
      wrap.style.transform = `translate3d(0, ${py.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      if (copy) {
        const hp = clamp(S.y / (hero.offsetHeight * 0.9));
        copy.style.transform = `translate3d(0, ${(S.y * 0.14).toFixed(1)}px, 0)`;
        copy.style.opacity = (1 - hp * 0.9).toFixed(3);
      }
    });
  });

  /* ---------- 5b. HERO · partículas de polvo bajo la luz ---------- */
  safe('hero-dust', () => {
    const canvas = $('#dust');
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // sprite precalculado (más barato que shadowBlur)
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(214,176,98,1)');
    grad.addColorStop(0.35, 'rgba(226,196,128,.55)');
    grad.addColorStop(1, 'rgba(240,220,170,0)');
    sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);

    let w = 0, h = 0, dpr = 1, parts = [];
    const build = () => {
      const count = S.vw < 768 ? 46 : 96;
      parts = Array.from({ length: count }, () => {
        const bokeh = Math.random() < 0.14;
        return {
          x: rand(0, w), y: rand(0, h),
          r: bokeh ? rand(9, 24) : rand(0.7, 2.4),
          vx: rand(-0.06, 0.1), vy: rand(-0.16, -0.02),
          a: bokeh ? rand(0.05, 0.12) : rand(0.35, 0.95),
          ph: rand(0, 6.28), sp: rand(0.4, 1.4), z: rand(0.4, 1.4), bokeh
        };
      });
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    window.addEventListener('resize', () => { clearTimeout(resize._t); resize._t = setTimeout(resize, 200); });

    frameTasks.push((t) => {
      if (!heroState.visible || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      const time = t * 0.001;
      const px = heroState.ptr.x, py = heroState.ptr.y, near = heroState.ptr.inside && finePointer;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        // deriva suave + oscilación
        p.x += (p.vx + Math.sin(time * 0.3 + p.ph) * 0.08) * p.z;
        p.y += p.vy * p.z;
        if (near) {
          const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 14400) { const f = (1 - d2 / 14400) * 0.9; p.x += (dx / (Math.sqrt(d2) + 1)) * f; p.y += (dy / (Math.sqrt(d2) + 1)) * f; }
        }
        if (p.x < -30) p.x = w + 30; else if (p.x > w + 30) p.x = -30;
        if (p.y < -30) { p.y = h + 30; p.x = rand(0, w); } else if (p.y > h + 30) p.y = -30;

        // más brillo cerca de la fuente de luz (arriba a la derecha)
        const dist = Math.hypot(p.x - w * 0.82, p.y - h * 0.06) / (Math.max(w, h) * 0.95);
        const lit = 0.3 + clamp(1 - dist) * 0.9;
        const tw = 0.55 + 0.45 * Math.sin(time * p.sp + p.ph);
        ctx.globalAlpha = clamp(p.a * lit * (p.bokeh ? 1 : tw));
        const size = p.r * (p.bokeh ? 2 : 5);
        ctx.drawImage(sprite, p.x - size, p.y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
    });
  });

  /* ---------- 6. Manifiesto: palabras que se iluminan con el scroll + contadores ---------- */
  safe('manifesto', () => {
    const text = $('[data-scrub]');
    if (!text) return;

    // envolver cada palabra conservando <em>
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'sw'; s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(text);
    if (reduced) { text.classList.add('is-static'); return; }

    const last = new Array(words.length).fill(-1);
    scrollTasks.push(() => {
      const r = text.getBoundingClientRect();
      if (r.bottom < -100 || r.top > S.vh + 100) return;
      const start = S.vh * 0.88, end = S.vh * 0.42;
      const p = clamp((start - r.top) / (start - end + r.height));
      const n = words.length, spread = 5;
      for (let i = 0; i < n; i++) {
        const v = 0.16 + 0.84 * clamp((p * (n + spread) - i) / spread);
        if (Math.abs(v - last[i]) > 0.01) { words[i].style.opacity = v.toFixed(2); last[i] = v; }
      }
    });

    // arte de fondo (casa del logotipo) con parallax
    const art = $('.manifesto__art');
    if (art) {
      scrollTasks.push(() => {
        const r = art.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > S.vh) return;
        const c = r.top + r.height / 2 - S.vh / 2;
        art.style.setProperty('--py', `${(-c * 0.12).toFixed(1)}px`);
        art.style.setProperty('--rot', `${(c * 0.006).toFixed(2)}deg`);
      });
    }
  });

  safe('counters', () => {
    const nums = $$('[data-count]');
    const box = $('.stats');
    if (!nums.length || !box) return;
    const run = () => {
      nums.forEach((el) => {
        const end = parseFloat(el.dataset.count);
        if (reduced) { el.textContent = end; return; }
        const t0 = performance.now(), dur = 2000;
        (function step(now) {
          const k = clamp((now - t0) / dur);
          el.textContent = Math.round(end * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k)));
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    };
    nums.forEach((el) => { el.textContent = '0'; });
    if (!('IntersectionObserver' in window)) { nums.forEach((el) => { el.textContent = el.dataset.count; }); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(box);
  });

  /* Tarjetas con foco de luz que sigue al puntero */
  safe('spotlight', () => {
    if (!finePointer) return;
    $$('[data-spot]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  });

  /* ---------- 7. Explorador de luz ---------- */
  safe('lab', () => {
    const win = $('#labWin');
    if (!win) return;
    const zebra = $('.zebra--lab', win);
    const range = $('#labRange');
    const tabs = $$('#labTabs [role="tab"]');
    const info = $('#labInfo');
    const title = $('#labTitle'), desc = $('#labDesc'), ideal = $('#labIdeal');
    const cta = $('#labCta'), ctaLabel = $('#labCtaLabel');
    const timeBtns = $$('.lab__time button');
    const M = {
      light: [$('#mLight'), $('#mLightBar')], priv: [$('#mPriv'), $('#mPrivBar')],
      view: [$('#mView'), $('#mViewBar')], heat: [$('#mHeat'), $('#mHeatBar')]
    };

    // L = luz · V = vista exterior · P = privacidad (de día) · H = control de calor/brillo (al cerrar)
    const DATA = {
      sheer: {
        name: 'Sheer Elegance', mode: 'zebra',
        desc: 'Bandas alternas de tela translúcida y opaca que regulan la luz con un acabado de revista. Decoran tanto como funcionan.',
        ideal: 'salas, comedores y recámaras con mucha luz natural',
        cta: 'Esta es la que quiero', L: [62, 28], V: [78, 30], P: [14, 68], H: 58, base: 0.3
      },
      daynight: {
        name: 'Día y Noche', mode: 'zebra',
        desc: 'Dos capas, dos ambientes. Alinea las bandas para dejar entrar el día y ciérralas por completo para tu privacidad nocturna.',
        ideal: 'recámaras, estancias y cualquier ventana que mire a la calle',
        cta: 'Quiero Día y Noche', L: [58, 5], V: [70, 0], P: [18, 100], H: 88, base: 0.3
      },
      blackout: {
        name: 'Enrollable Blackout', mode: 'roller',
        desc: 'Bloquea la luz para que duermas mejor, veas mejor tus películas y trabajes sin reflejos. La oscuridad que tu espacio necesita.',
        ideal: 'recámaras, cuartos de TV, salas de juntas y consultorios',
        cta: 'Quiero oscuridad total', L: [100, 2], V: [100, 0], P: [0, 100], H: 94, base: 0.65
      },
      transl: {
        name: 'Enrollable Traslúcida', mode: 'roller',
        desc: 'Suaviza la luz natural y mantiene una privacidad discreta. Ambiente luminoso, sin deslumbramientos.',
        ideal: 'oficinas, estudios, cocinas y espacios de trabajo',
        cta: 'Quiero luz suave', L: [100, 38], V: [100, 12], P: [0, 72], H: 62, base: 0.65
      },
      screen: {
        name: 'Screen / Sunscreen', mode: 'roller',
        desc: 'Reduce el calor y el brillo del sol sin que renuncies a la vista al exterior. Para ventanales con mucha exposición.',
        ideal: 'ventanales, terrazas, oficinas y salas con sol directo',
        cta: 'Quiero menos sol', L: [100, 30], V: [100, 62], P: [0, 42], H: 80, base: 0.65
      }
    };

    let type = 'sheer';
    let s = 0;                       // posición actual 0..1
    let auto = true, lastUser = 0, t0 = 0, ph0 = 0;
    let visible = false, dragging = false;
    const cache = {};

    const phaseFor = (v) => Math.asin(clamp((v - 0.52) / 0.4, -1, 1));
    const setRangeVisual = (v) => range.style.setProperty('--pct', `${v}%`);
    const setMeter = (key, v) => {
      const [valEl, barEl] = M[key];
      const r = Math.round(v);
      if (cache[key] !== r) { valEl.textContent = `${r}%`; barEl.style.setProperty('--v', (r / 100).toFixed(3)); cache[key] = r; }
    };

    function apply() {
      const d = DATA[type];
      const night = win.dataset.time === 'night';
      if (d.mode === 'zebra') zebra.style.setProperty('--o', s.toFixed(4));
      win.style.setProperty('--c', s.toFixed(4));
      const light = lerp(d.L[0], d.L[1], s);
      const view = lerp(d.V[0], d.V[1], s);
      const priv = lerp(d.P[0], d.P[1], s);
      const heat = d.H * (d.mode === 'zebra' ? 0.15 + 0.85 * s : s);
      win.style.setProperty('--light', ((light / 100) * (night ? 0.1 : 1)).toFixed(3));
      setMeter('light', light); setMeter('priv', priv); setMeter('view', view); setMeter('heat', heat);
    }

    function setType(next, focus = false) {
      if (!DATA[next]) return;
      type = next;
      const d = DATA[next];
      win.dataset.type = next;
      tabs.forEach((tb) => {
        const on = tb.dataset.type === next;
        tb.setAttribute('aria-selected', on ? 'true' : 'false');
        tb.tabIndex = on ? 0 : -1;
        if (on) { info.setAttribute('aria-labelledby', tb.id); if (focus) tb.focus(); }
      });
      info.style.transition = 'opacity .25s ease'; info.style.opacity = '0';
      setTimeout(() => {
        title.textContent = d.name; desc.textContent = d.desc; ideal.textContent = d.ideal;
        info.style.opacity = '1';
      }, 220);
      ctaLabel.textContent = d.cta;
      cta.href = waUrl(`Hola Persianas Zapotlán, estuve probando el explorador de su sitio y la persiana ${d.name} es la que quiero. ¿Me cotizan?`);
      cta.dataset.wa = `Hola Persianas Zapotlán, estuve probando el explorador de su sitio y la persiana ${d.name} es la que quiero. ¿Me cotizan?`;
      // posición inicial que deja ver el efecto de inmediato
      s = d.base; ph0 = phaseFor(s); t0 = performance.now();
      range.value = Math.round(s * 100); setRangeVisual(range.value);
      apply();
    }

    tabs.forEach((tb, i) => {
      tb.addEventListener('click', () => setType(tb.dataset.type));
      tb.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in keys) { e.preventDefault(); const n = (i + keys[e.key] + tabs.length) % tabs.length; setType(tabs[n].dataset.type, true); }
        else if (e.key === 'Home') { e.preventDefault(); setType(tabs[0].dataset.type, true); }
        else if (e.key === 'End') { e.preventDefault(); setType(tabs[tabs.length - 1].dataset.type, true); }
      });
    });

    timeBtns.forEach((b) => b.addEventListener('click', () => {
      win.dataset.time = b.dataset.time;
      timeBtns.forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      apply();
    }));

    range.addEventListener('input', () => {
      auto = false; lastUser = performance.now(); s = clamp(range.value / 100); setRangeVisual(range.value); apply();
    });
    ['pointerdown', 'touchstart'].forEach((ev) => range.addEventListener(ev, () => { dragging = true; auto = false; }, { passive: true }));
    ['pointerup', 'pointercancel', 'touchend', 'blur'].forEach((ev) => range.addEventListener(ev, () => { dragging = false; lastUser = performance.now(); }));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 }).observe(win);
    } else visible = true;

    // animación automática continua hasta que el usuario toma el control
    frameTasks.push((t) => {
      if (!visible || reduced) return;
      if (!auto && !dragging && t - lastUser > 9000) { auto = true; ph0 = phaseFor(s); t0 = t; }
      if (!auto) return;
      const target = 0.52 + 0.4 * Math.sin(((t - t0) / 1000) * (Math.PI * 2 / 10) + ph0);
      s += (target - s) * 0.12;
      const v = Math.round(s * 100);
      if (String(v) !== range.value) { range.value = v; setRangeVisual(v); }
      apply();
    });

    setType('sheer');
  });

  /* ---------- 8. Colección: scroll horizontal fijado (desktop) / carrusel (móvil) ---------- */
  safe('collection', () => {
    const sec = $('#coleccion'), pin = $('#colPin'), track = $('#colTrack');
    if (!sec || !pin || !track) return;
    const bar = $('#colBar'), nowEl = $('#colNow');
    const cards = $$('.pcard', track);
    const mq = window.matchMedia('(min-width: 1024px)');
    let enabled = false, maxX = 0, travel = 1, lastIdx = -1;

    const setup = () => {
      const want = mq.matches && !reduced;
      if (want) {
        sec.classList.add('col--pinned');
        track.style.alignSelf = 'flex-start';
        track.style.transform = 'translate3d(0,0,0)';
        maxX = Math.max(0, track.scrollWidth - window.innerWidth);
        travel = maxX;
        pin.style.setProperty('--pin-h', `${window.innerHeight + travel}px`);
        enabled = true;
      } else {
        sec.classList.remove('col--pinned');
        track.style.transform = ''; track.style.alignSelf = '';
        pin.style.removeProperty('--pin-h');
        enabled = false;
      }
    };
    setup();
    mq.addEventListener('change', setup);
    let to;
    window.addEventListener('resize', () => { clearTimeout(to); to = setTimeout(setup, 180); });
    window.addEventListener('load', setup);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup);

    scrollTasks.push(() => {
      if (!enabled) return;
      const r = pin.getBoundingClientRect();
      if (r.bottom < -50 || r.top > S.vh + 50) return;
      const p = clamp(-r.top / travel);
      track.style.transform = `translate3d(${(-p * maxX).toFixed(1)}px,0,0)`;
      bar.style.setProperty('--v', p.toFixed(4));
      const idx = Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1);
      if (idx !== lastIdx) { nowEl.textContent = pad2(idx); lastIdx = idx; }
    });
  });

  /* ---------- 8b. Exterior: los videos se reproducen solo mientras están a la vista ---------- */
  safe('exterior-video', () => {
    const vids = $$('video[data-inview]');
    if (!vids.length) return;
    if (reduced || !('IntersectionObserver' in window)) return;   // sin autoplay: se usan los controles nativos
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { const p = e.target.play(); if (p && p.catch) p.catch(() => { /* autoplay bloqueado */ }); }
        else e.target.pause();
      });
    }, { threshold: 0.35 });
    vids.forEach((v) => io.observe(v));
  });

  /* ---------- 9. Proceso: línea que se llena con el scroll ---------- */
  safe('process', () => {
    const list = $('#steps');
    if (!list) return;
    const steps = $$('[data-step]', list);
    if (reduced) { steps.forEach((s) => s.classList.add('is-active')); list.style.setProperty('--prog', 1); return; }
    let lastP = -1;
    scrollTasks.push(() => {
      const r = list.getBoundingClientRect();
      if (r.bottom < -80 || r.top > S.vh + 80) return;
      const line = S.vh * 0.62;
      const p = clamp((line - r.top) / r.height);
      if (Math.abs(p - lastP) > 0.001) { list.style.setProperty('--prog', p.toFixed(4)); lastP = p; }
      steps.forEach((st) => {
        const sr = st.getBoundingClientRect();
        st.classList.toggle('is-active', sr.top < line);
      });
    });
  });

  /* ---------- 10. Parallax de imágenes + palabra del footer ---------- */
  safe('parallax', () => {
    if (reduced) return;
    const imgs = $$('[data-parallax]');
    scrollTasks.push(() => {
      imgs.forEach((img) => {
        const box = img.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > S.vh) return;
        const f = parseFloat(img.dataset.parallax) || 0.15;
        const c = box.top + box.height / 2 - S.vh / 2;
        const lim = box.height * 0.13;
        img.style.transform = `translate3d(0, ${clamp(-c * f, -lim, lim).toFixed(1)}px, 0)`;
      });
    });
    const word = $('[data-footer-word]');
    if (word) {
      scrollTasks.push(() => {
        const r = word.getBoundingClientRect();
        if (r.bottom < 0 || r.top > S.vh + 200) return;
        const p = clamp((S.vh * 1.02 - r.top) / (S.vh * 0.55));
        word.style.setProperty('--fill', `${(p * 100).toFixed(1)}%`);
      });
    }
  });

  /* ---------- 11. Galería + lightbox ---------- */
  safe('lightbox', () => {
    const dlg = $('#lightbox');
    const triggers = $$('[data-lightbox]');
    if (!dlg || !triggers.length || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg'), cap = $('#lbCap');
    let index = 0, opener = null;

    const show = (i) => {
      index = (i + triggers.length) % triggers.length;
      const btn = triggers[index], src = $('img', btn);
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      const c = $('.g-item__cap', btn);
      cap.textContent = c ? c.textContent.replace(/\s+/g, ' ').trim() : src.alt;
    };
    triggers.forEach((btn, i) => btn.addEventListener('click', () => {
      opener = btn; show(i); dlg.showModal(); if (lenis) lenis.stop();
    }));
    $('#lbClose').addEventListener('click', () => dlg.close());
    $('#lbPrev').addEventListener('click', () => show(index - 1));
    $('#lbNext').addEventListener('click', () => show(index + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    dlg.addEventListener('close', () => { if (lenis && !doc.classList.contains('is-locked')) lenis.start(); if (opener) opener.focus(); });
  });

  /* ---------- 12. FAQ con apertura animada ---------- */
  safe('faq', () => {
    const items = $$('.qa');
    const animate = (d, open) => {
      const body = $('.qa__a', d);
      if (d._anim) d._anim.cancel();
      if (reduced || !body.animate) { d.open = open; return; }
      if (open) {
        d.open = true;
        const h = body.offsetHeight;
        d._anim = body.animate({ height: ['0px', `${h}px`] }, { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
        d._anim.onfinish = () => { d._anim = null; };
      } else {
        const h = body.offsetHeight;
        d._anim = body.animate({ height: [`${h}px`, '0px'] }, { duration: 380, easing: 'cubic-bezier(.76,0,.24,1)' });
        d._anim.onfinish = () => { d.open = false; d._anim = null; };
      }
    };
    items.forEach((d) => {
      $('summary', d).addEventListener('click', (e) => {
        e.preventDefault();
        if (d.open) { animate(d, false); return; }
        items.forEach((o) => { if (o !== d && o.open) animate(o, false); });
        animate(d, true);
      });
    });
  });

  /* ---------- 13. Formulario → WhatsApp ---------- */
  safe('form', () => {
    const form = $('#quoteForm');
    if (!form) return;
    const name = $('#f-name'), errName = $('#err-name');
    const ok = $('#formOk'), fallback = $('#formFallback');

    const setErr = (field, input, msg) => {
      field.classList.toggle('is-invalid', !!msg);
      errName.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    name.addEventListener('input', () => { if (name.value.trim().length >= 2) setErr(name.closest('.field'), name, ''); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nm = name.value.trim();
      if (nm.length < 2) {
        setErr(name.closest('.field'), name, 'Cuéntanos tu nombre para saber con quién hablamos.');
        name.focus();
        return;
      }
      const d = new FormData(form);
      const space = d.get('space') || 'mi hogar';
      const type = (d.get('type') || '').toString().trim();
      const w = (d.get('w') || '').toString().trim();
      const h = (d.get('h') || '').toString().trim();
      const msg = (d.get('msg') || '').toString().trim();

      let text = `Hola Persianas Zapotlán, soy ${nm}. Me gustaría cotizar persianas para ${space}.`;
      text += type ? `\nMe interesa: ${type}.` : '\nAún no estoy seguro del tipo de persiana, me gustaría recibir asesoría.';
      if (w || h) text += `\nMedidas aproximadas de mi ventana: ${w || '?'} cm de ancho × ${h || '?'} cm de alto.`;
      if (msg) text += `\nComentarios: ${msg}`;
      text += '\nEscribo desde su página web. ¡Gracias!';

      const url = waUrl(text);
      fallback.href = url;
      ok.hidden = false;
      window.open(url, '_blank', 'noopener');
    });
  });

  /* ---------- 14. Extras: ticker reactivo, botones magnéticos, cursor de luz, tip de WhatsApp ---------- */
  safe('ticker', () => {
    const track = $('#tickerTrack');
    if (!track || reduced || !track.getAnimations) return;
    let anim = null, cur = 1;
    frameTasks.push(() => {
      if (!anim) { anim = track.getAnimations()[0]; if (!anim) return; }
      const target = 1 + Math.min(Math.abs(S.vel) * 0.28, 7);
      cur += (target - cur) * 0.07;
      anim.playbackRate = cur * (S.dir < 0 && Math.abs(S.vel) > 2 ? -1 : 1);
    });
  });

  safe('magnet', () => {
    if (!finePointer || reduced) return;
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate3d(${(dx * 12).toFixed(1)}px, ${(dy * 10).toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  });

  safe('cursor-glow', () => {
    const glow = $('#glowCursor');
    if (!glow || !finePointer || reduced) return;
    let x = S.vw / 2, y = S.vh / 2, gx = x, gy = y, shown = false;
    document.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; glow.style.opacity = '1'; }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; shown = false; });
    frameTasks.push(() => {
      gx += (x - gx) * 0.12; gy += (y - gy) * 0.12;
      glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
    });
  });

  safe('fab', () => {
    const fab = $('#fab'), close = $('#fabClose');
    if (!fab) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('pz-tip') === '1'; } catch (_) { /* modo privado */ }
    const hide = () => {
      fab.classList.remove('is-tip');
      try { sessionStorage.setItem('pz-tip', '1'); } catch (_) { /* noop */ }
    };
    close.addEventListener('click', hide);
    if (!dismissed) {
      setTimeout(() => fab.classList.add('is-tip'), 9000);
      setTimeout(() => fab.classList.remove('is-tip'), 21000);
    }
  });

  /* ---------- Arranque ---------- */
  const startExperience = () => {
    doc.classList.add('is-ready');
    const heroTitle = $('[data-split="hero"]');
    if (heroTitle) setTimeout(() => heroTitle.classList.add('is-in'), 120);
  };

  const resizeAll = () => { S.vh = window.innerHeight; S.vw = window.innerWidth; if (nav) navHeight = nav.offsetHeight || navHeight; };
  window.addEventListener('resize', resizeAll);

  requestAnimationFrame(frame);
  runLoader(startExperience);
})();
