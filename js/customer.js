/* =========================================================================
   customer.js — MODULE A GLOBAL SHELL
   Owner: ARSH
   -------------------------------------------------------------------------
   Runs on every customer page. Provides navigation, cart badge, toasts,
   format helpers, homepage rendering, and shared dish-card markup.

   CHANGED vs previous delivery: dish-card "Details" is now an <a> link to
   food-details.html?id=X instead of a modal trigger.
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.FMStorage;

  /* ---------- 1. FORMAT HELPERS ---------- */
  var currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  });

  function formatCurrency(v) { return currencyFormatter.format(Number(v) || 0); }

  function formatDate(dateString) {
    if (!dateString) return '—';
    var d = new Date(dateString + 'T00:00:00');
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTime(t) {
    if (!t) return '—';
    var p = String(t).split(':');
    var h = parseInt(p[0], 10);
    var m = p[1] || '00';
    if (isNaN(h)) return t;
    var sfx = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m + ' ' + sfx;
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function statusClass(status) {
    return 'pill--' + String(status || '').toLowerCase();
  }

  /* ---------- 2. TOASTS ---------- */
  function toast(message, type) {
    var host = document.querySelector('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'success');
    el.innerHTML = '<span class="toast__dot"></span><span>' + escapeHtml(message) + '</span>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { el.remove(); }, 420);
    }, 3000);
  }

  /* ---------- 3. CART BADGE ---------- */
  var lastBadgeCount = null;

  function syncCartBadge(bump) {
    var badge = document.getElementById('cartBadge');
    if (!badge) return;
    var count = S.getCartCount();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('is-visible', count > 0);
    if (bump && lastBadgeCount !== null && count > lastBadgeCount) {
      badge.classList.remove('is-bump');
      void badge.offsetWidth;
      badge.classList.add('is-bump');
    }
    lastBadgeCount = count;
  }

  /* ---------- 4. NAVIGATION ---------- */
  function initNav() {
    var nav = document.getElementById('siteNav');
    if (!nav) return;
    var toggle = document.getElementById('navToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); });
    });
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    nav.querySelectorAll('[data-nav]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (href === file) a.classList.add('is-active');
    });
  }

  /* ---------- 5. DISH CARD MARKUP ---------- */
  function dishCardMarkup(item) {
    var unavailable = item.available === false;
    return '' +
      '<article class="dish-card" data-dish-id="' + item.id + '">' +
        '<div class="dish-card__media">' +
          '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          (unavailable ? '<span class="dish-card__flag dish-card__flag--out">Sold out</span>' : '') +
          (item.featured && !unavailable ? '<span class="dish-card__flag">Chef\'s pick</span>' : '') +
        '</div>' +
        '<div class="dish-card__body">' +
          '<div class="dish-card__meta">' +
            '<span class="dish-card__category">' + escapeHtml(item.category) + '</span>' +
            '<span class="dish-card__price">' + formatCurrency(item.price) + '</span>' +
          '</div>' +
          '<h3 class="dish-card__title">' + escapeHtml(item.name) + '</h3>' +
          '<p class="dish-card__desc">' + escapeHtml(item.description) + '</p>' +
          '<div class="dish-card__foot">' +
            '<button class="btn btn--ghost btn--sm" data-add="' + item.id + '"' +
              (unavailable ? ' disabled aria-disabled="true"' : '') + '>' +
              (unavailable ? 'Unavailable' : 'Add to cart') +
            '</button>' +
            '<a class="dish-card__link" href="food-details.html?id=' + item.id + '">Details →</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- 6. HOMEPAGE ---------- */
  function renderFeatured() {
    var rail = document.getElementById('featuredRail');
    if (!rail) return;
    var menu = S.getMenu();
    var featured = menu.filter(function (f) { return f.featured; });
    if (!featured.length) featured = menu.slice(0, 4);
    rail.innerHTML = featured.map(dishCardMarkup).join('');
    if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(rail);
  }

  function renderHomeStats() {
    var bookings = S.getBookings();
    var completed = bookings.filter(function (b) { return b.status === S.STATUS.COMPLETED; }).length;
    var map = {
      statDishes: S.getMenu().length,
      statBookings: Math.max(bookings.length, 1200),
      statCompleted: Math.max(completed, 860),
      statGuests: 9400
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('data-counter', String(map[id]));
    });
  }

  /* ---------- 7. ADD-TO-CART DELEGATION ---------- */
  function initGlobalCartButtons() {
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-add]');
      if (!addBtn) return;
      e.preventDefault();
      var id = Number(addBtn.getAttribute('data-add'));
      var item = S.getFoodItem(id);
      if (!item) return;
      if (item.available === false) {
        toast('That dish is currently unavailable.', 'error');
        return;
      }
      var qty = Number(addBtn.getAttribute('data-add-qty')) || 1;
      S.addToCart(id, qty);
      toast(item.name + ' added to your cart.');
    });
  }

  /* ---------- 8. SYNC ---------- */
  function bindSync() {
    document.addEventListener(S.EVENTS.CART, function () { syncCartBadge(true); });
    document.addEventListener(S.EVENTS.MENU, renderFeatured);
  }

  /* ---------- 9. BOOT ---------- */
  function init() {
    initNav();
    syncCartBadge(false);
    bindSync();
    initGlobalCartButtons();
    renderFeatured();
    renderHomeStats();
    if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(document);
  }

  global.FMUI = {
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatTime: formatTime,
    todayISO: todayISO,
    escapeHtml: escapeHtml,
    statusClass: statusClass,
    toast: toast,
    syncCartBadge: syncCartBadge,
    dishCardMarkup: dishCardMarkup
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);