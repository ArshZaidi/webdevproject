
/* =========================================================================
   AURUM KITCHEN — PREMIUM MOTION ENGINE
   Smooth scrolling, reveals, magnetic buttons, ambient lighting,
   pointer-following reflections and restrained 3D card tilt.
   ========================================================================= */

(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var lenis = null;
  var lenisLoading = false;
  var revealObserver = null;
  var parallaxNodes = [];
  var scaleNodes = [];
  var ticking = false;

  /* ---------- 1. AMBIENT LIGHT LAYER ---------- */

  function initAmbientLight() {
    if (document.querySelector('.fm-ambient')) return;

    var ambient = document.createElement('div');
    ambient.className = 'fm-ambient';
    ambient.setAttribute('aria-hidden', 'true');

    ambient.innerHTML =
      '<span class="fm-ambient__orb fm-ambient__orb--gold"></span>' +
      '<span class="fm-ambient__orb fm-ambient__orb--green"></span>' +
      '<span class="fm-ambient__orb fm-ambient__orb--cream"></span>';

    document.body.prepend(ambient);
  }

  /* ---------- 2. LENIS SMOOTH SCROLL ---------- */

  function addLenisStyles() {
    if (document.getElementById('fm-lenis-styles')) return;

    var style = document.createElement('style');
    style.id = 'fm-lenis-styles';

    style.textContent = `
      html.lenis,
      html.lenis body {
        height: auto;
      }

      .lenis.lenis-smooth {
        scroll-behavior: auto !important;
      }

      .lenis.lenis-smooth [data-lenis-prevent] {
        overscroll-behavior: contain;
      }

      .lenis.lenis-stopped {
        overflow: hidden;
      }
    `;

    document.head.appendChild(style);
  }

  function startLenis() {
    if (reduceMotion || lenis || lenisLoading) return;

    if (global.Lenis) {
      createLenis();
      return;
    }

    lenisLoading = true;

    var script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js';
    script.async = true;

    script.onload = function () {
      lenisLoading = false;

      if (global.Lenis) {
        createLenis();
      } else {
        console.warn('Lenis constructor was not found.');
      }
    };

    script.onerror = function () {
      lenisLoading = false;
      console.warn('Lenis failed to load. Native scrolling remains enabled.');
    };

    document.head.appendChild(script);
  }

  function createLenis() {
    if (!global.Lenis || lenis || reduceMotion) return;

    addLenisStyles();

    lenis = new global.Lenis({
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      infinite: false,
      autoRaf: true
    });

    lenis.on('scroll', function () {
      updateScrollTransforms();
      updateStickyNav();
    });

    if (global.location.hash) {
      var id = global.location.hash.substring(1);
      var target = document.getElementById(id);

      if (target) {
        lenis.scrollTo(target, {
          offset: -100,
          immediate: true
        });
      }
    }
  }

  /* ---------- 3. SCROLL REVEALS ---------- */

  function buildRevealObserver() {
    if (!('IntersectionObserver' in global)) return null;

    return new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.08
    });
  }

  function observeReveals(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll(
      '[data-reveal]:not(.is-visible)'
    );

    nodes.forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');

      if (delay) {
        el.style.setProperty('--reveal-delay', delay + 'ms');
      }
    });

    if (reduceMotion || !revealObserver) {
      nodes.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    nodes.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- 4. PARALLAX AND SCROLL SCALE ---------- */

  function collectScrollTargets() {
    parallaxNodes = Array.prototype.slice.call(
      document.querySelectorAll('[data-parallax]')
    );

    scaleNodes = Array.prototype.slice.call(
      document.querySelectorAll('[data-scale]')
    );
  }

  function updateScrollTransforms() {
    var vh = global.innerHeight;

    parallaxNodes.forEach(function (el) {
      var speed =
        parseFloat(el.getAttribute('data-parallax')) || 0.12;

      var rect = el.getBoundingClientRect();

      if (rect.bottom < -200 || rect.top > vh + 200) return;

      var offset = (rect.top + rect.height / 2) - vh / 2;

      el.style.setProperty(
        '--parallax-y',
        (-offset * speed).toFixed(2) + 'px'
      );
    });

    scaleNodes.forEach(function (el) {
      var amount =
        parseFloat(el.getAttribute('data-scale')) || 0.06;

      var rect = el.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > vh) return;

      var progress = 1 - Math.min(
        1,
        Math.max(0, rect.top / vh)
      );

      var scale = 1 + amount * (1 - progress);

      el.style.setProperty('--scroll-scale', scale.toFixed(4));
    });
  }

  /* ---------- 5. STICKY NAVIGATION ---------- */

  function updateStickyNav() {
    var nav = document.getElementById('siteNav');
    if (!nav) return;

    nav.classList.toggle('is-stuck', global.scrollY > 24);
  }

  function onScroll() {
    if (ticking) return;

    ticking = true;

    global.requestAnimationFrame(function () {
      updateScrollTransforms();
      updateStickyNav();
      ticking = false;
    });
  }

  /* ---------- 6. MAGNETIC BUTTONS ---------- */

  function initMagnetic(root) {
    if (reduceMotion) return;

    if (!global.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches) return;

    var scope = root || document;

    scope.querySelectorAll('.magnetic').forEach(function (el) {
      if (el.dataset.magneticBound === '1') return;

      el.dataset.magneticBound = '1';

      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var rafId = null;

      function animate() {
        currentX += (targetX - currentX) * 0.16;
        currentY += (targetY - currentY) * 0.16;

        el.style.setProperty('--mag-x', currentX.toFixed(2) + 'px');
        el.style.setProperty('--mag-y', currentY.toFixed(2) + 'px');

        if (
          Math.abs(targetX - currentX) +
          Math.abs(targetY - currentY) > 0.1
        ) {
          rafId = global.requestAnimationFrame(animate);
        } else {
          currentX = targetX;
          currentY = targetY;
          rafId = null;
        }
      }

      function start() {
        if (rafId === null) {
          rafId = global.requestAnimationFrame(animate);
        }
      }

      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();

        targetX =
          (e.clientX - rect.left - rect.width / 2) * 0.22;

        targetY =
          (e.clientY - rect.top - rect.height / 2) * 0.22;

        start();
      });

      el.addEventListener('pointerleave', function () {
        targetX = 0;
        targetY = 0;
        start();
      });
    });
  }

  /* ---------- 7. PREMIUM CARD INTERACTIONS ---------- */

  function initPremiumInteractions(root) {
    if (reduceMotion) return;

    if (!global.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches) return;

    var scope = root || document;

    var selectors = [
      '.dish-card',
      '.how__step',
      '.hero__card',
      '.admin-card',
      '.metric-card',
      '.booking-card'
    ].join(',');

    scope.querySelectorAll(selectors).forEach(function (el) {
      if (el.dataset.premiumBound === '1') return;

      el.dataset.premiumBound = '1';
      el.classList.add('premium-card');

      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();

        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;

        el.style.setProperty('--pointer-x', x + '%');
        el.style.setProperty('--pointer-y', y + '%');

        if (el.classList.contains('hero__card')) return;

        var normalizedX = (x / 100) - 0.5;
        var normalizedY = (y / 100) - 0.5;

        el.style.setProperty(
          '--tilt-x',
          (-normalizedY * 5).toFixed(2) + 'deg'
        );

        el.style.setProperty(
          '--tilt-y',
          (normalizedX * 5).toFixed(2) + 'deg'
        );
      });

      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ---------- 8. ANIMATED COUNTERS ---------- */

  function animateCounter(el) {
    var target =
      parseFloat(el.getAttribute('data-counter')) || 0;

    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';

    if (reduceMotion) {
      el.textContent =
        prefix + target.toLocaleString('en-IN') + suffix;
      return;
    }

    var start = null;
    var duration = 1500;

    function step(timestamp) {
      if (start === null) start = timestamp;

      var progress = Math.min(
        1,
        (timestamp - start) / duration
      );

      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);

      el.textContent =
        prefix + value.toLocaleString('en-IN') + suffix;

      if (progress < 1) {
        global.requestAnimationFrame(step);
      }
    }

    global.requestAnimationFrame(step);
  }

  function initCounters(root) {
    var scope = root || document;

    var nodes = scope.querySelectorAll(
      '[data-counter]:not([data-counted])'
    );

    if (!nodes.length) return;

    if (!('IntersectionObserver' in global) || reduceMotion) {
      nodes.forEach(function (el) {
        el.setAttribute('data-counted', '1');
        animateCounter(el);
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.setAttribute('data-counted', '1');
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.4
    });

    nodes.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 9. CUSTOM CURSOR ---------- */

  function initCursor() {
    if (reduceMotion) return;

    if (!global.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches) return;

    if (document.querySelector('.fm-cursor')) return;

    var cursor = document.createElement('div');
    cursor.className = 'fm-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    var mouseX = -100;
    var mouseY = -100;
    var currentX = -100;
    var currentY = -100;
    var started = false;

    function render() {
      currentX += (mouseX - currentX) * 0.2;
      currentY += (mouseY - currentY) * 0.2;

      cursor.style.transform =
        'translate3d(' +
        (currentX - cursor.offsetWidth / 2) + 'px,' +
        (currentY - cursor.offsetHeight / 2) + 'px,0)';

      global.requestAnimationFrame(render);
    }

    document.addEventListener('pointermove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!started) {
        started = true;
        cursor.classList.add('is-active');
        render();
      }
    });

    document.addEventListener('pointerleave', function () {
      cursor.classList.remove('is-active');
    });

    document.addEventListener('pointerover', function (e) {
      var target = e.target;

      if (!target.closest) return;

      var interactive = target.closest(
        'a, button, input, select, textarea, .dish-card'
      );

      cursor.classList.toggle('is-hover', !!interactive);
    });
  }

  /* ---------- 10. SMOOTH IN-PAGE ANCHORS ---------- */

  function initSmoothAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');

      if (!link) return;

      var hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      var targetId;

      try {
        targetId = decodeURIComponent(hash.substring(1));
      } catch (error) {
        return;
      }

      var target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      if (global.location.hash !== hash) {
        global.history.pushState(null, '', hash);
      }

      if (lenis) {
        lenis.scrollTo(target, {
          offset: -100,
          duration: 1.15
        });
      } else {
        var top =
          target.getBoundingClientRect().top +
          global.scrollY - 100;

        global.scrollTo({
          top: top,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
    });
  }

  /* ---------- 11. INITIALIZATION ---------- */

  function init() {
    initAmbientLight();

    revealObserver = buildRevealObserver();

    collectScrollTargets();
    observeReveals(document);
    initMagnetic(document);
    initPremiumInteractions(document);
    initCounters(document);
    initCursor();
    initSmoothAnchors();
    updateStickyNav();

    startLenis();

    global.addEventListener('scroll', onScroll, {
      passive: true
    });

    global.addEventListener('resize', function () {
      collectScrollTargets();
      onScroll();
    });

    updateScrollTransforms();
  }

  /* ---------- 12. PUBLIC API ---------- */

  global.FMAnim = {
    observeReveals: observeReveals,
    initMagnetic: initMagnetic,
    initCounters: initCounters,
    initPremiumInteractions: initPremiumInteractions,

    scrollTo: function (target, options) {
      if (lenis) {
        lenis.scrollTo(target, options || {});
      } else if (typeof target === 'number') {
        global.scrollTo({
          top: target,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      } else if (target) {
        target.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
    },

    refresh: function (root) {
      observeReveals(root);
      initMagnetic(root);
      initPremiumInteractions(root);
      initCounters(root);
      collectScrollTargets();
      updateScrollTransforms();
    },

    reduceMotion: reduceMotion
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
