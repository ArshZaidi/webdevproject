/* ============================================================
   animations.js — Shared vanilla animation utilities
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    const nodes = document.querySelectorAll('.reveal, .reveal-scale, .reveal-stagger');
    if (!nodes.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(n => n.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    nodes.forEach(n => io.observe(n));
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = Number(el.dataset.magnetic) || 14;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    const target = Number(el.dataset.count || 0);
    const duration = Number(el.dataset.duration) || 1200;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const isFloat = String(target).includes('.');
    const startVal = 0;

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = startVal + (target - startVal) * eased;
      el.textContent = prefix + (isFloat ? val.toFixed(2) : Math.round(val).toLocaleString('en-IN')) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(c => io.observe(c));
  }

  /* ---------- Parallax ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    let raf = null;
    function update() {
      const scrollY = window.scrollY;
      els.forEach(el => {
        const speed = Number(el.dataset.parallax) || 0.15;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + scrollY - window.innerHeight / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
      raf = null;
    }
    function onScroll() {
      if (raf === null) raf = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  /* ---------- Smooth anchor scroll ---------- */
  function initSmoothAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Public init (idempotent) ---------- */
  function initAll() {
    initReveals();
    initMagnetic();
    initCounters();
    initParallax();
    initSmoothAnchors();
  }

  window.FMAnimations = {
    init: initAll,
    animateCounter,
    initCounters,
    initReveals
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();