
/* =========================================================================
   animations.js — SHARED MOTION ENGINE
   Smooth scrolling + magnetic interactions + existing motion effects
   ========================================================================= */

(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var lenis = null;
  var lenisLoading = false;

  /* ---------- 1. LENIS SMOOTH SCROLL ---------- */

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

      .lenis.lenis-smooth iframe {
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
  }

  function startLenis() {
    if (reduceMotion || lenis || lenisLoading) return;

    // Load Lenis dynamically. No HTML script-tag change is required.
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
        console.warn('Lenis loaded, but its constructor was not found.');
      }
    };

    script.onerror = function () {
      lenisLoading = false;
      console.warn('Lenis could not load. Using native smooth scrolling.');
    };

    document.head.appendChild(script);
  }

  function createLenis() {
    if (!global.Lenis || lenis || reduceMotion) return;

    addLenisStyles();

    lenis = new global.Lenis({
      duration: 1.2,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
      autoRaf: true
    });

    // Keep the scroll-dependent effects in sync with Lenis.
    lenis.on('scroll', function () {
      updateScrollTransforms();
      updateStickyNav();
    });

    // Handle links clicked before Lenis finished loading.
    if (global.location.hash) {
      var initialTarget = document.getElementById(
        decodeURIComponent(global.location.hash.substring(1))
      );

      if (initialTarget) {
        lenis.scrollTo(initialTarget, {
          offset: -96,
          immediate: true
        });
      }
    }
  }

  /* ---------- 2. SCROLL REVEALS ---------- */

  var revealObserver = null;

  function buildRevealObserver() {
    if (!('IntersectionObserver' in global)) return null;

    return new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        el.classList.add('is-visible');
        revealObserver.unobserve(el);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -12% 0px',
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

  /* ---------- 3. PARALLAX + SCROLL SCALE ---------- */

  var parallaxNodes = [];
  var scaleNodes = [];

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
        parseFloat(el.getAttribute('data-parallax')) || 0.15;

      var rect = el.getBoundingClientRect();

      if (rect.bottom < -200 || rect.top > vh + 200) return;

      var offset = (rect.top + rect.height / 2) - vh / 2;

      el.style.transform =
        'translate3d(0,' +
        (-offset * speed).toFixed(2) +
        'px,0)';
    });

    scaleNodes.forEach(function (el) {
      var amount =
        parseFloat(el.getAttribute('data-scale')) || 0.08;

      var rect = el.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > vh) return;

      var progress = 1 - Math.min(
        1,
        Math.max(0, rect.top / vh)
      );

      var scale = 1 + amount * (1 - progress);

      el.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
  }

  /* ---------- 4. SCROLL LOOP + STICKY NAV ---------- */

  var ticking = false;

  function onScroll() {
    if (ticking) return;

    ticking = true;

    global.requestAnimationFrame(function () {
      updateScrollTransforms();
      updateStickyNav();
      ticking = false;
    });
  }

  function updateStickyNav() {
    var nav = document.getElementById('siteNav');

    if (!nav) return;

    if (global.scrollY > 24) {
      nav.classList.add('is-stuck');
    } else {
      nav.classList.remove('is-stuck');
    }
  }

  /* ---------- 5. SMOOTH MAGNETIC BUTTONS ---------- */

  function initMagnetic(root) {
    if (reduceMotion) return;

    // Magnetic movement is intended for mouse/trackpad devices.
    if (!global.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    var scope = root || document;
    var strength = 0.28;

    scope.querySelectorAll('.magnetic').forEach(function (el) {
      if (el.dataset.magneticBound === '1') return;

      el.dataset.magneticBound = '1';

      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var rafId = null;

      function animateMagnet() {
        currentX += (targetX - currentX) * 0.16;
        currentY += (targetY - currentY) * 0.16;

        el.style.transform =
          'translate3d(' +
          currentX.toFixed(2) +
          'px,' +
          currentY.toFixed(2) +
          'px,0)';

        var distance =
          Math.abs(targetX - currentX) +
          Math.abs(targetY - currentY);

        if (distance > 0.1) {
          rafId = global.requestAnimationFrame(animateMagnet);
        } else {
          currentX = targetX;
          currentY = targetY;
          el.style.transform =
            'translate3d(' +
            currentX +
            'px,' +
            currentY +
            'px,0)';

          rafId = null;
        }
      }

      function startAnimation() {
        if (rafId !== null) return;
        rafId = global.requestAnimationFrame(animateMagnet);
      }

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();

        targetX =
          (e.clientX - rect.left - rect.width / 2) * strength;

        targetY =
          (e.clientY - rect.top - rect.height / 2) * strength;

        startAnimation();
      });

      el.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        startAnimation();
      });
    });
  }

  /* ---------- 6. ANIMATED COUNTERS ---------- */

  function animateCounter(el) {
    var target =
      parseFloat(el.getAttribute('data-counter')) || 0;

    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var duration = 1500;
    var start = null;

    if (reduceMotion) {
      el.textContent =
        prefix + target.toLocaleString('en-IN') + suffix;
      return;
    }

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

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.setAttribute('data-counted', '1');
        animateCounter(entry.target);
        io.unobserve(entry.target);
      });
    }, {
      threshold: 0.4
    });

    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- 7. CUSTOM CURSOR ---------- */

  function initCursor() {
    if (reduceMotion) return;

    if (!global.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches) {
      return;
    }

    // Prevent duplicate cursors.
    if (document.querySelector('.fm-cursor')) return;

    var dot = document.createElement('div');
    dot.className = 'fm-cursor';
    dot.setAttribute('aria-hidden', 'true');

    document.body.appendChild(dot);

    var mouseX = -100;
    var mouseY = -100;
    var currentX = -100;
    var currentY = -100;

    function render() {
      currentX += (mouseX - currentX) * 0.18;
      currentY += (mouseY - currentY) * 0.18;

      dot.style.transform =
        'translate3d(' +
        (currentX - dot.offsetWidth / 2) +
        'px,' +
        (currentY - dot.offsetHeight / 2) +
        'px,0)';

      global.requestAnimationFrame(render);
    }

    var cursorStarted = false;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!cursorStarted) {
        cursorStarted = true;
        dot.classList.add('is-active');
        render();
      }
    });

    document.addEventListener('mouseleave', function () {
      dot.classList.remove('is-active');
    });

    document.addEventListener('mouseover', function (e) {
      var interactive = e.target.closest(
        'a, button, .dish-card, .qty-btn, input, select, textarea'
      );

      dot.classList.toggle('is-hover', !!interactive);
    });
  }

  /* ---------- 8. SMOOTH IN-PAGE ANCHORS ---------- */

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

      // Update the URL without triggering an instant browser jump.
      if (global.location.hash !== hash) {
        global.history.pushState(null, '', hash);
      }

      if (lenis) {
        lenis.scrollTo(target, {
          offset: -96,
          duration: 1.2
        });
      } else {
        var top =
          target.getBoundingClientRect().top +
          global.scrollY -
          96;

        global.scrollTo({
          top: top,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
    });
  }

  /* ---------- 9. BOOT ---------- */

  function init() {
    revealObserver = buildRevealObserver();

    collectScrollTargets();
    observeReveals(document);
    initMagnetic(document);
    initCounters(document);
    initCursor();
    initSmoothAnchors();
    updateStickyNav();

    // Start Lenis after the rest of the animations are initialized.
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

  /* ---------- 10. PUBLIC API ---------- */

  global.FMAnim = {
    observeReveals: observeReveals,
    initMagnetic: initMagnetic,
    initCounters: initCounters,

    // Useful if another script needs to scroll programmatically.
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


  /* ---------- PREMIUM INTERACTIONS ---------- */

  function initPremiumInteractions(root) {
    if (reduceMotion) return;

    var scope = root || document;

    var canHover = global.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches;

    if (!canHover) return;

    var selectors = [
      '.dish-card',
      '.how__step',
      '.hero__card',
      '.admin-card',
      '.metric-card',
      '.booking-card'
    ];

    scope.querySelectorAll(selectors.join(',')).forEach(function (el) {
      if (el.dataset.premiumBound === '1') return;

      el.dataset.premiumBound = '1';
      el.classList.add('pointer-glow');

      // Mouse-following liquid light.
      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();

        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;

        el.style.setProperty('--pointer-x', x + '%');
        el.style.setProperty('--pointer-y', y + '%');
      });

      // Restrict 3D tilt to cards that do not already use magnetic movement.
      if (
        el.classList.contains('magnetic') ||
        el.closest('.magnetic')
      ) return;

      var frame = null;
      var rotateX = 0;
      var rotateY = 0;
      var currentX = 0;
      var currentY = 0;
      var active = false;

      function renderTilt() {
        currentX += (rotateX - currentX) * 0.12;
        currentY += (rotateY - currentY) * 0.12;

        el.style.transform =
          'perspective(1000px) ' +
          'rotateX(' + currentX.toFixed(2) + 'deg) ' +
          'rotateY(' + currentY.toFixed(2) + 'deg) ' +
          'translateY(-4px)';

        if (
          Math.abs(rotateX - currentX) > 0.02 ||
          Math.abs(rotateY - currentY) > 0.02
        ) {
          frame = global.requestAnimationFrame(renderTilt);
        } else {
          frame = null;
        }
      }

      function startTilt() {
        if (frame === null) {
          frame = global.requestAnimationFrame(renderTilt);
        }
      }

      el.addEventListener('pointerenter', function () {
        active = true;
        el.classList.add('tilt-card');
      });

      el.addEventListener('pointermove', function (e) {
        if (!active) return;

        var rect = el.getBoundingClientRect();

        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;

        rotateY = (x - 0.5) * 7;
        rotateX = (0.5 - y) * 7;

        startTilt();
      });

      el.addEventListener('pointerleave', function () {
        active = false;
        rotateX = 0;
        rotateY = 0;
        startTilt();

        el.classList.remove('tilt-card');

        // Remove the inline transform after the return animation.
        global.setTimeout(function () {
          if (!active) {
            el.style.removeProperty('transform');
          }
        }, 650);
      });
    });
  }
