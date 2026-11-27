/* =========================================================================
   animations.js — SHARED MOTION ENGINE
   Owners: Arsh + Kanish
   ========================================================================= */
(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. SCROLL REVEALS ---------- */
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
    var nodes = scope.querySelectorAll('[data-reveal]:not(.is-visible)');

    nodes.forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
    });

    if (reduceMotion || !revealObserver) {
      nodes.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    nodes.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- 2. PARALLAX + SCROLL SCALE ---------- */
  var parallaxNodes = [];
  var scaleNodes = [];

  function collectScrollTargets() {
    parallaxNodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    scaleNodes = Array.prototype.slice.call(document.querySelectorAll('[data-scale]'));
  }

  function updateScrollTransforms() {
    var vh = global.innerHeight;

    parallaxNodes.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      var offset = (rect.top + rect.height / 2) - vh / 2;
      el.style.transform = 'translate3d(0,' + (-offset * speed).toFixed(2) + 'px,0)';
    });

    scaleNodes.forEach(function (el) {
      var amount = parseFloat(el.getAttribute('data-scale')) || 0.08;
      var rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      var progress = 1 - Math.min(1, Math.max(0, rect.top / vh));
      var scale = 1 + amount * (1 - progress);
      el.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
  }

  /* ---------- 3. rAF SCROLL LOOP ---------- */
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
    if (global.scrollY > 24) nav.classList.add('is-stuck');
    else nav.classList.remove('is-stuck');
  }

  /* ---------- 4. MAGNETIC BUTTONS ---------- */
  function initMagnetic(root) {
    if (reduceMotion) return;
    var scope = root || document;
    var strength = 0.28;

    scope.querySelectorAll('.magnetic').forEach(function (el) {
      if (el.dataset.magneticBound === '1') return;
      el.dataset.magneticBound = '1';

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * strength;
        var y = (e.clientY - rect.top - rect.height / 2) * strength;
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transform = 'translate3d(0,0,0)';
      });
    });
  }

  /* ---------- 5. ANIMATED COUNTERS ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-counter')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var duration = 1500;
    var start = null;

    if (reduceMotion) {
      el.textContent = prefix + target.toLocaleString('en-IN') + suffix;
      return;
    }

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min(1, (timestamp - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);
      el.textContent = prefix + value.toLocaleString('en-IN') + suffix;
      if (progress < 1) global.requestAnimationFrame(step);
    }

    global.requestAnimationFrame(step);
  }

  function initCounters(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-counter]:not([data-counted])');
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
    }, { threshold: 0.4 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 6. CUSTOM CURSOR ---------- */
  function initCursor() {
    if (reduceMotion) return;
    if (!global.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var dot = document.createElement('div');
    dot.className = 'fm-cursor';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);

    var mouseX = -100, mouseY = -100;
    var currentX = -100, currentY = -100;
    var rafId = null;

    function render() {
      currentX += (mouseX - currentX) * 0.18;
      currentY += (mouseY - currentY) * 0.18;
      dot.style.transform =
        'translate3d(' + (currentX - dot.offsetWidth / 2) + 'px,' +
                         (currentY - dot.offsetHeight / 2) + 'px,0)';
      rafId = global.requestAnimationFrame(render);
    }

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!dot.classList.contains('is-active')) {
        dot.classList.add('is-active');
        render();
      }
    });

    document.addEventListener('mouseleave', function () {
      dot.classList.remove('is-active');
    });

    document.addEventListener('mouseover', function (e) {
      var interactive = e.target.closest('a, button, .dish-card, .qty-btn, input, select, textarea');
      dot.classList.toggle('is-hover', !!interactive);
    });
  }

  /* ---------- 7. SMOOTH IN-PAGE ANCHORS ---------- */
  function initSmoothAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + global.scrollY - 96;
      global.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 8. BOOT ---------- */
  function init() {
    revealObserver = buildRevealObserver();
    collectScrollTargets();
    observeReveals(document);
    initMagnetic(document);
    initCounters(document);
    initCursor();
    initSmoothAnchors();
    updateStickyNav();

    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', function () {
      collectScrollTargets();
      onScroll();
    });

    updateScrollTransforms();
  }

  global.FMAnim = {
    observeReveals: observeReveals,
    initMagnetic: initMagnetic,
    initCounters: initCounters,
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