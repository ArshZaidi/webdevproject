/* =========================================================================
   menu.js — MENU + FOOD DETAILS
   Owner: ARSH
   -------------------------------------------------------------------------
   Handles BOTH menu.html (grid + filters + search) and food-details.html
   (single dish page with quantity stepper). Detects page by presence of
   #menuGrid vs #dishDetail.
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.FMStorage;
  var UI = global.FMUI;

  /* ================================================================
     MENU PAGE
     ================================================================ */
  function initMenuPage() {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;

    var searchInput = document.getElementById('menuSearch');
    var filtersEl = document.getElementById('menuFilters');
    var metaEl = document.getElementById('menuMeta');
    var emptyEl = document.getElementById('menuEmpty');
    var clearBtn = document.getElementById('clearFilters');

    var state = { category: 'All', query: '' };

    function renderFilters() {
      var cats = ['All'].concat(S.getCategories());
      filtersEl.innerHTML = cats.map(function (cat) {
        var active = state.category === cat ? ' is-active' : '';
        return '<button class="chip' + active + '" data-category="' +
               UI.escapeHtml(cat) + '">' + UI.escapeHtml(cat) + '</button>';
      }).join('');
    }

    function applyFilters() {
      var menu = S.getMenu();
      var q = state.query.trim().toLowerCase();

      return menu.filter(function (item) {
        var inCat = state.category === 'All' || item.category === state.category;
        if (!inCat) return false;
        if (!q) return true;
        return (item.name + ' ' + item.description + ' ' + item.category +
                ' ' + (item.tags || []).join(' ')).toLowerCase().indexOf(q) !== -1;
      });
    }

    function render() {
      var list = applyFilters();

      metaEl.textContent = list.length + (list.length === 1 ? ' dish' : ' dishes') +
        (state.category !== 'All' ? ' in ' + state.category : '') +
        (state.query ? ' matching “' + state.query + '”' : '');

      if (!list.length) {
        grid.innerHTML = '';
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;

      grid.innerHTML = list.map(function (item, i) {
        var card = UI.dishCardMarkup(item);
        // Add reveal
        return card.replace('<article class="dish-card"',
          '<article class="dish-card" data-reveal="up" data-reveal-delay="' + (i * 40) + '"');
      }).join('');

      if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(grid);
    }

    // events
    filtersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-category]');
      if (!btn) return;
      state.category = btn.getAttribute('data-category');
      renderFilters();
      render();
    });

    var debounceId;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceId);
      debounceId = setTimeout(function () {
        state.query = searchInput.value;
        render();
      }, 180);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state.category = 'All';
        state.query = '';
        searchInput.value = '';
        renderFilters();
        render();
      });
    }

    // Re-render when the menu changes from another tab (admin)
    document.addEventListener(S.EVENTS.MENU, function () {
      renderFilters();
      render();
    });

    renderFilters();
    render();
  }

  /* ================================================================
     FOOD DETAILS PAGE
     ================================================================ */
  function initDetailsPage() {
    var container = document.getElementById('dishDetail');
    if (!container) return;

    var params = new URLSearchParams(location.search);
    var id = Number(params.get('id'));
    var item = id ? S.getFoodItem(id) : null;

    if (!item) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon">○</div>' +
          '<h3>Dish not found</h3>' +
          '<p>This dish may have been removed from the menu.</p>' +
          '<a class="btn btn--primary" href="menu.html">Back to menu</a>' +
        '</div>';
      return;
    }

    document.title = item.name + ' — Aurum Kitchen';

    var unavailable = item.available === false;
    var tagsHtml = (item.tags || []).map(function (t) {
      return '<span class="pill">' + UI.escapeHtml(t) + '</span>';
    }).join('');

    container.innerHTML =
      '<div class="dish-detail__media">' +
        '<img src="' + UI.escapeHtml(item.image) + '" alt="' + UI.escapeHtml(item.name) + '" onerror="this.style.display=\'none\'">' +
        (unavailable ? '<span class="dish-detail__flag">Sold out</span>' : '') +
      '</div>' +
      '<div class="dish-detail__info">' +
        '<div class="dish-detail__eyebrow">' +
          '<span class="pill pill--dot">' + UI.escapeHtml(item.category) + '</span>' +
          (item.featured ? '<span class="pill">Chef\'s pick</span>' : '') +
        '</div>' +
        '<h1>' + UI.escapeHtml(item.name) + '</h1>' +
        '<span class="dish-detail__price">' + UI.formatCurrency(item.price) + '</span>' +
        '<p class="dish-detail__desc">' + UI.escapeHtml(item.description) + '</p>' +
        (tagsHtml ? '<div class="dish-detail__tags">' + tagsHtml + '</div>' : '') +
        '<div class="dish-detail__actions">' +
          '<div class="qty-stepper">' +
            '<button type="button" id="qtyMinus" aria-label="Decrease quantity">−</button>' +
            '<input type="number" id="qtyInput" value="1" min="1" max="99" aria-label="Quantity" />' +
            '<button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<button class="btn btn--primary magnetic" id="addBtn"' +
            (unavailable ? ' disabled aria-disabled="true"' : '') + '>' +
            '<span>' + (unavailable ? 'Currently unavailable' : 'Add to cart') + '</span>' +
          '</button>' +
          '<a class="btn btn--ghost" href="cart.html"><span>View cart</span></a>' +
        '</div>' +
        '<p class="dish-detail__note">Prepared to order. Availability is live — if the kitchen marks it sold out, it can\'t be added.</p>' +
      '</div>';

    // Quantity stepper
    var input = document.getElementById('qtyInput');
    document.getElementById('qtyMinus').addEventListener('click', function () {
      input.value = Math.max(1, Number(input.value) - 1);
    });
    document.getElementById('qtyPlus').addEventListener('click', function () {
      input.value = Math.min(99, Number(input.value) + 1);
    });
    input.addEventListener('change', function () {
      var v = Math.max(1, Math.min(99, Number(input.value) || 1));
      input.value = v;
    });

    // Add to cart
    var addBtn = document.getElementById('addBtn');
    if (addBtn && !unavailable) {
      addBtn.addEventListener('click', function () {
        S.addToCart(item.id, Number(input.value) || 1);
        UI.toast(item.name + ' added to your cart.');
        UI.syncCartBadge(true);
      });
    }

    // Related dishes (same category, exclude current)
    var related = S.getMenu().filter(function (f) {
      return f.category === item.category && f.id !== item.id;
    }).slice(0, 3);

    var relatedSection = document.getElementById('relatedSection');
    var relatedGrid = document.getElementById('relatedGrid');
    if (related.length && relatedSection && relatedGrid) {
      relatedSection.hidden = false;
      relatedGrid.innerHTML = related.map(function (r, i) {
        return UI.dishCardMarkup(r).replace('<article class="dish-card"',
          '<article class="dish-card" data-reveal="up" data-reveal-delay="' + (i * 60) + '"');
      }).join('');
      if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(relatedGrid);
    }

    if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(container);
  }

  /* ================================================================
     BOOT
     ================================================================ */
  function init() {
    initMenuPage();
    initDetailsPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);