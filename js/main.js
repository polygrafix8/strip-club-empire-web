/**
 * Strip Club Empire — main interactions
 * Cursor glow, mobile CTA, carousel, trailer stub, nav, scroll reveals
 */

// === CONFIG (swap these when live) ===
const STEAM_URL = 'https://store.steampowered.com/app/4994860/Strip_Club_Empire/';
const FACEBOOK_URL = 'https://www.facebook.com/stripclubempire/';
const TWITTER_URL = 'https://x.com/stripclubempire';
const YOUTUBE_VIDEO_ID = '2JXnBtyA3ig'; // sizzle; swap for gameplay trailer later
const YOUTUBE_ORIGIN_HOST = 'stripclubempire.com';
// Optional local MP4 fallback path (leave empty to use YouTube)
const LOCAL_GAMEPLAY_MP4 = ''; // e.g. 'assets/video/gameplay.mp4'

document.addEventListener('DOMContentLoaded', () => {
  initAgeGate(() => {
    initCursorGlow();
    initHeader();
    initMobileNav();
    initMobileCta();
    initSmoothScroll();
    initReveal();
    initCarousel();
    initTrailerStub();
    initExternalLinks();
    initSteamCta();
  });
});

const AGE_KEY = 'sce_age_ok';

function initAgeGate(onEnter) {
  const root = document.documentElement;
  const gate = document.getElementById('ageGate');
  const denied = document.getElementById('ageGateDenied');
  const enterBtn = document.getElementById('ageGateEnter');
  const exitBtn = document.getElementById('ageGateExit');

  const unlock = () => {
    try { localStorage.setItem(AGE_KEY, '1'); } catch (e) { /* private mode */ }
    root.classList.remove('age-locked');
    root.classList.add('age-ok');
    if (gate) {
      gate.hidden = true;
      gate.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    if (typeof onEnter === 'function') onEnter();
  };

  let already = false;
  try { already = localStorage.getItem(AGE_KEY) === '1'; } catch (e) { already = false; }

  if (already) {
    root.classList.remove('age-locked');
    root.classList.add('age-ok');
    if (gate) gate.hidden = true;
    if (typeof onEnter === 'function') onEnter();
    return;
  }

  // First visit: show gate, keep site shell inaccessible
  root.classList.add('age-locked');
  root.classList.remove('age-ok');
  if (gate) {
    gate.hidden = false;
    gate.setAttribute('aria-hidden', 'false');
  }
  document.body.style.overflow = 'hidden';

  if (enterBtn) {
    enterBtn.addEventListener('click', unlock);
  }
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      const card = gate && gate.querySelector('.age-gate-card');
      if (card) card.hidden = true;
      if (denied) {
        denied.hidden = false;
        denied.style.display = 'block';
      }
      // Do not unlock site or run interactive features
    });
  }
}

function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;
  document.body.classList.add('has-pointer');
  let raf = 0;
  let x = 0;
  let y = 0;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        glow.style.left = x + 'px';
        glow.style.top = y + 'px';
        raf = 0;
      });
    }
  });
}

function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const panel = document.getElementById('mobileNav');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  panel.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function initMobileCta() {
  const mobileCta = document.getElementById('mobileCta');
  const closeBtn = document.querySelector('.btn-close-mobile-cta');
  if (!mobileCta || !closeBtn) return;

  let ctaHidden = localStorage.getItem('sce_mobile_cta_hidden');
  if (ctaHidden === 'true') {
    mobileCta.style.display = 'none';
  }

  window.addEventListener('scroll', () => {
    const y = window.pageYOffset || document.documentElement.scrollTop;
    if (y > 500 && ctaHidden !== 'true') {
      mobileCta.style.display = 'flex';
    } else if (y <= 300) {
      mobileCta.style.display = 'none';
    }
  }, { passive: true });

  closeBtn.addEventListener('click', () => {
    mobileCta.style.display = 'none';
    localStorage.setItem('sce_mobile_cta_hidden', 'true');
    ctaHidden = 'true';
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initReveal() {
  const sections = document.querySelectorAll('section.section');
  if (!('IntersectionObserver' in window)) {
    sections.forEach((s) => s.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  sections.forEach((s) => io.observe(s));
  // hero always visible
  const hero = document.getElementById('hero');
  if (hero) hero.classList.add('visible');
}

function initCarousel() {
  const root = document.getElementById('screenshotCarousel');
  if (!root) return;
  const track = document.getElementById('carouselTrack');
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const dotsWrap = document.getElementById('carouselDots');
  const thumbs = Array.from(document.querySelectorAll('#thumbStrip button'));
  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');
  if (!slides.length) return;

  let index = 0;
  const autoMs = parseInt(root.dataset.autoplay || '0', 10);
  let timer = null;

  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to screenshot ${i + 1}`);
    if (i === 0) b.classList.add('active');
    b.addEventListener('click', () => go(i));
    dotsWrap.appendChild(b);
  });
  const dots = Array.from(dotsWrap.children);

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle('active', di === index));
    thumbs.forEach((t, ti) => t.classList.toggle('active', ti === index));
    restartAuto();
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  function restartAuto() {
    if (!autoMs) return;
    clearInterval(timer);
    timer = setInterval(next, autoMs);
  }

  prevBtn && prevBtn.addEventListener('click', prev);
  nextBtn && nextBtn.addEventListener('click', next);
  thumbs.forEach((t) => {
    t.addEventListener('click', () => go(parseInt(t.dataset.index, 10) || 0));
  });

  // Touch / drag
  let startX = 0;
  let deltaX = 0;
  let dragging = false;
  const viewport = root.querySelector('.carousel-viewport');

  const onStart = (x) => {
    dragging = true;
    startX = x;
    deltaX = 0;
    clearInterval(timer);
  };
  const onMove = (x) => {
    if (!dragging) return;
    deltaX = x - startX;
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(deltaX) > 50) {
      deltaX < 0 ? next() : prev();
    } else {
      restartAuto();
    }
  };

  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    onStart(e.clientX);
  });
  viewport.addEventListener('pointermove', (e) => onMove(e.clientX));
  viewport.addEventListener('pointerup', onEnd);
  viewport.addEventListener('pointercancel', onEnd);

  // Keyboard
  root.tabIndex = 0;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  go(0);
  restartAuto();
}

function initTrailerStub() {
  const stub = document.getElementById('videoStub');
  const shell = document.getElementById('videoShell');
  if (!stub || !shell) return;

  const mountPlayer = () => {
    if (shell.dataset.loaded === '1') return;
    shell.dataset.loaded = '1';
    stub.remove();

    if (LOCAL_GAMEPLAY_MP4) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.src = LOCAL_GAMEPLAY_MP4;
      video.poster = 'assets/images/trailer-thumb.jpg';
      shell.appendChild(video);
      return;
    }

    const iframe = document.createElement('iframe');
    // No origin in static src (works on file://). Inject later when on live domain.
    iframe.src = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`;
    iframe.title = 'Strip Club Empire Trailer';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    shell.appendChild(iframe);

    // Origin injection for production domain only
    if (window.location.protocol !== 'file:') {
      const host = window.location.hostname.replace(/^www\./, '');
      if (host === YOUTUBE_ORIGIN_HOST || host.endsWith('.' + YOUTUBE_ORIGIN_HOST)) {
        const src = iframe.getAttribute('src');
        const join = src.includes('?') ? '&' : '?';
        iframe.setAttribute('src', `${src}${join}origin=${encodeURIComponent(window.location.origin)}`);
      }
    }
  };

  stub.addEventListener('click', mountPlayer);
  stub.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      mountPlayer();
    }
  });
}

function initExternalLinks() {
  if (FACEBOOK_URL) {
    ['fbLink', 'fbFooter', 'fbMobileLink'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = FACEBOOK_URL;
    });
  }
  if (typeof TWITTER_URL === 'string' && TWITTER_URL) {
    ['xLink', 'xFooter', 'xMobileLink'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = TWITTER_URL;
    });
  }
}

function initSteamCta() {
  const cta = document.getElementById('steamCta');
  if (!cta) return;
  if (STEAM_URL) {
    cta.href = STEAM_URL;
    cta.target = '_blank';
    cta.rel = 'noopener';
    cta.removeAttribute('aria-disabled');
    cta.textContent = 'Wishlist on Steam';
    cta.title = 'Open Steam store page';
  }
}
