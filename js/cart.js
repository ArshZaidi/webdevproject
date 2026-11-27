/* =========================================================================
   cart.js — CART PAGE
   Owner: ARSH
   -------------------------------------------------------------------------
   Renders cart lines, quantity steppers, remove buttons, and a sticky
   summary with total. Everything talks to FMStorage so admin changes
   (e.g. a dish being deleted or marked unavailable) are reflected live.
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.FMStorage;
  var UI = global.FMUI;

  function init() {
    var layout = document.getElementById('cartLayout');
    if (!layout) return;

    var linesEl = document.getElementById('cartLines');
    var summaryEl = document.getElementById('cartSummary');
    var emptyEl = document.getElementById('cartEmpty');

    function render() {
      var lines = S.getCartLines();

      if (!lines.length) {
        layout.hidden = true;
        emptyEl.hidden = false;
        return;
      }
      layout.hidden = false;
      emptyEl.hidden = true;

      linesEl.innerHTML = lines.map(function (line) {
        var unavailable = !line.available;
        return '' +
          '<div class="cart-line" data-food="' + line.foodId + '">' +
            '<div class="cart-line__media">' +
              '<img src="' + UI.escapeHtml(line.image) + '" alt="' + UI.escapeHtml(line.name) + '" onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div class="cart-line__body">' +
              '<div class="cart-line__category">' + UI.escapeHtml(line.category) + '</div>' +
              '<div class="cart-line__name">' + UI.escapeHtml(line.name) + '</div>' +
              '<div class="cart-line__controls">' +
                '<div class="qty-stepper">' +
                  '<button type="button" data-qty-minus aria-label="Decrease">−</button>' +
                  '<input type="number" value="' + line.quantity + '" min="1" max="99" data-qty-input aria-label="Quantity" />' +
                  '<button type="button" data-qty-plus aria-label="Increase">+</button>' +
                '</div>' +
                '<button class="cart-line__remove" data-remove>Remove</button>' +
                (unavailable ? '<span class="pill pill--cancelled">Sold out</span>' : '') +
              '</div>' +
            '</div>' +
            '<div class="cart-line__total">' + UI.formatCurrency(line.lineTotal) + '</div>' +
          '</div>';
      }).join('');

      renderSummary(lines);
    }

    function renderSummary(lines) {
      var total = lines.reduce(function (sum, l) { return sum + l.lineTotal; }, 0);
      var count = lines.reduce(function (sum, l) { return sum + l.quantity; }, 0);
      var anyUnavailable = lines.some(function (l) { return !l.available; });

      var itemsHtml = lines.map(function (l) {
        return '<div class="cart-summary__row">' +
          '<span>' + UI.escapeHtml(l.name) + ' × ' + l.quantity + '</span>' +
          '<span>' + UI.formatCurrency(l.lineTotal) + '</span>' +
        '</div>';
      }).join('');

      summaryEl.innerHTML =
        '<h3>Order summary</h3>' +
        itemsHtml +
        '<div class="cart-summary__row" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line);">' +
          '<span>Items</span><span>' + count + '</span>' +
        '</div>' +
        '<div class="cart-summary__total">' +
          '<span>Total</span>' +
          '<span>' + UI.formatCurrency(total) + '</span>' +
        '</div>' +
        (anyUnavailable ? '<p class="field__hint" style="color:#96382A;margin-top:14px;text-align:center;">Some items are now sold out. Please remove them before booking.</p>' : '') +
        '<a class="btn btn--primary btn--block magnetic" href="booking.html"' +
          (anyUnavailable ? ' aria-disabled="true" style="pointer-events:none;opacity:.5;"' : '') + '>' +
          '<span>Proceed to booking</span>' +
        '</a>' +
        '<p class="cart-summary__note">You can review everything once more before confirming.</p>';
    }

    // Delegated interactions
    linesEl.addEventListener('click', function (e) {
      var row = e.target.closest('[data-food]');
      if (!row) return;
      var foodId = Number(row.getAttribute('data-food'));
      var input = row.querySelector('[data-qty-input]');
      var currentQty = Number(input.value) || 1;

      if (e.target.closest('[data-qty-minus]')) {
        S.setCartQty(foodId, Math.max(1, currentQty - 1));
      } else if (e.target.closest('[data-qty-plus]')) {
        S.setCartQty(foodId, Math.min(99, currentQty + 1));
      } else if (e.target.closest('[data-remove]')) {
        var line = S.getCartLines().filter(function (l) { return l.foodId === foodId; })[0];
        S.removeFromCart(foodId);
        UI.toast((line ? line.name : 'Item') + ' removed from cart.');
      }
    });

    linesEl.addEventListener('change', function (e) {
      if (!e.target.matches('[data-qty-input]')) return;
      var row = e.target.closest('[data-food]');
      var foodId = Number(row.getAttribute('data-food'));
      var v = Math.max(1, Math.min(99, Number(e.target.value) || 1));
      S.setCartQty(foodId, v);
    });

    document.addEventListener(S.EVENTS.CART, render);
    document.addEventListener(S.EVENTS.MENU, render);

    render();
    UI.syncCartBadge(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);