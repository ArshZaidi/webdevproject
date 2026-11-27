/* =========================================================================
   booking.js — BOOKING FORM + MY BOOKINGS
   Owner: ARSH
   -------------------------------------------------------------------------
   booking.html: full form (customer details, date, time slot, notes),
     live summary from cart, validation, and confirmation screen.
   my-bookings.html: list of all bookings with filter chips, cancel action,
     and live status updates from the admin side.
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.FMStorage;
  var UI = global.FMUI;

  /* ================================================================
     BOOKING FORM PAGE
     ================================================================ */
  var TIME_SLOTS = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  function initBookingForm() {
    var form = document.getElementById('bookingForm');
    if (!form) return;

    var layout = document.getElementById('bookingLayout');
    var summaryEl = document.getElementById('bookingSummary');
    var confirmEl = document.getElementById('bookingConfirm');
    var dateInput = document.getElementById('bookingDate');
    var slotsWrap = document.getElementById('timeSlots');

    var cartLines = S.getCartLines();

    // No cart → redirect softly with a message
    if (!cartLines.length) {
      layout.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="empty-state__icon">○</div>' +
          '<h3>Your cart is empty</h3>' +
          '<p>Add a dish from the menu before booking.</p>' +
          '<a class="btn btn--primary" href="menu.html">Browse the menu</a>' +
        '</div>';
      return;
    }

    // Prepare date input
    var today = UI.todayISO();
    dateInput.min = today;
    dateInput.value = today;

    // Render time slots
    function renderSlots() {
      slotsWrap.innerHTML = TIME_SLOTS.map(function (t) {
        var selected = form.dataset.slot === t ? ' is-selected' : '';
        return '<button type="button" class="timeslot' + selected + '" data-slot="' +
               t + '" role="radio" aria-checked="' + (form.dataset.slot === t ? 'true' : 'false') + '">' +
               UI.formatTime(t) + '</button>';
      }).join('');
    }

    slotsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-slot]');
      if (!btn) return;
      var slot = btn.getAttribute('data-slot');
      form.dataset.slot = slot;
      renderSlots();
    });

    // Render summary
    function renderSummary() {
      var total = cartLines.reduce(function (sum, l) { return sum + l.lineTotal; }, 0);
      var rows = cartLines.map(function (l) {
        return '<div class="booking-summary__line">' +
          '<span>' + UI.escapeHtml(l.name) + ' × ' + l.quantity + '</span>' +
          '<span>' + UI.formatCurrency(l.lineTotal) + '</span>' +
        '</div>';
      }).join('');

      summaryEl.innerHTML =
        '<h3>Your order</h3>' +
        rows +
        '<div class="booking-summary__total">' +
          '<span>Total</span><span>' + UI.formatCurrency(total) + '</span>' +
        '</div>' +
        '<button class="btn btn--gold btn--block magnetic" id="confirmBtn" type="button">' +
          '<span>Confirm booking</span>' +
        '</button>' +
        '<p class="booking-summary__hint">You can cancel before the kitchen starts cooking.</p>';

      var confirmBtn = document.getElementById('confirmBtn');
      confirmBtn.addEventListener('click', handleSubmit);
    }

    // Validation helpers
    function setError(fieldName, message) {
      var field = form.querySelector('[data-field="' + fieldName + '"]');
      if (!field) return;
      field.classList.toggle('has-error', !!message);
      var errEl = field.querySelector('.field__error');
      if (errEl) {
        errEl.textContent = message || '';
        errEl.classList.toggle('is-visible', !!message);
      }
    }

    function clearError(fieldName) { setError(fieldName, ''); }

    ['customerName', 'phone', 'bookingDate'].forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.addEventListener('input', function () { clearError(name); });
    });

    function validate() {
      var ok = true;
      var name = form.customerName.value.trim();
      var phone = form.phone.value.trim();
      var date = form.bookingDate.value;
      var slot = form.dataset.slot;

      if (!name || name.length < 2) {
        setError('customerName', 'Please enter your full name.');
        ok = false;
      }
      if (!/^\d{10}$/.test(phone)) {
        setError('phone', 'Enter a valid 10-digit mobile number.');
        ok = false;
      }
      if (!date) {
        setError('bookingDate', 'Please choose a date.');
        ok = false;
      } else if (date < UI.todayISO()) {
        setError('bookingDate', 'The date can\'t be in the past.');
        ok = false;
      }
      if (!slot) {
        setError('bookingTime', 'Please select a time slot.');
        ok = false;
      }
      return ok;
    }

    function handleSubmit() {
      if (!validate()) {
        var firstErr = form.querySelector('.field.has-error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Re-check availability at confirm time
      var fresh = S.getCartLines();
      var unavailable = fresh.filter(function (l) { return !l.available; });
      if (unavailable.length) {
        UI.toast('Some items are now sold out. Please review your cart.', 'error');
        return;
      }

      var booking;
      try {
        booking = S.createBooking({
          customerName: form.customerName.value.trim(),
          phone: form.phone.value.trim(),
          items: fresh.map(function (l) {
            return { foodId: l.foodId, name: l.name, quantity: l.quantity, price: l.price };
          }),
          bookingDate: form.bookingDate.value,
          bookingTime: form.dataset.slot,
          notes: form.notes.value.trim()
        });
      } catch (err) {
        UI.toast(err.message || 'Could not create booking.', 'error');
        return;
      }

      S.clearCart();
      UI.syncCartBadge(false);
      showConfirmation(booking);
    }

    function showConfirmation(booking) {
      layout.hidden = true;
      confirmEl.hidden = false;
      confirmEl.innerHTML =
        '<svg class="confirm-check" viewBox="0 0 100 100" aria-hidden="true">' +
          '<circle cx="50" cy="50" r="44"/>' +
          '<path d="M30 52 L45 67 L72 38"/>' +
        '</svg>' +
        '<h2>Booking confirmed</h2>' +
        '<p>Thanks, ' + UI.escapeHtml(booking.customerName.split(' ')[0]) +
          '. The kitchen has your order for ' + UI.formatDate(booking.bookingDate) +
          ' at ' + UI.formatTime(booking.bookingTime) + '.</p>' +
        '<div class="booking-confirm__id">' + UI.escapeHtml(booking.id) + '</div>' +
        '<p>You can track its status any time from My Bookings.</p>' +
        '<div class="booking-confirm__actions">' +
          '<a class="btn btn--primary magnetic" href="my-bookings.html"><span>View my bookings</span></a>' +
          '<a class="btn btn--ghost" href="menu.html"><span>Back to menu</span></a>' +
        '</div>';

      confirmEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderSlots();
    renderSummary();
    UI.syncCartBadge(false);
  }

  /* ================================================================
     MY BOOKINGS PAGE
     ================================================================ */
  function initMyBookings() {
    var listEl = document.getElementById('bookingsList');
    if (!listEl) return;

    var emptyEl = document.getElementById('bookingsEmpty');
    var filterEl = document.getElementById('bookingsFilter');
    var activeFilter = 'all';

    function matchesFilter(booking) {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'active') {
        return S.ACTIVE_STATUSES.indexOf(booking.status) !== -1;
      }
      if (activeFilter === 'completed') {
        return booking.status === S.STATUS.COMPLETED;
      }
      if (activeFilter === 'cancelled') {
        return booking.status === S.STATUS.CANCELLED || booking.status === S.STATUS.REJECTED;
      }
      return true;
    }

    function render() {
      var all = S.getBookings().slice().sort(function (a, b) {
        // Newest first, then by booking date
        var aDate = a.bookingDate + 'T' + (a.bookingTime || '00:00');
        var bDate = b.bookingDate + 'T' + (b.bookingTime || '00:00');
        return bDate.localeCompare(aDate);
      });

      var list = all.filter(matchesFilter);

      if (!list.length) {
        listEl.innerHTML = '';
        if (all.length === 0) {
          emptyEl.hidden = false;
          emptyEl.querySelector('h3').textContent = 'No bookings yet';
          emptyEl.querySelector('p').textContent = 'Your reserved meals will appear here once you place a booking.';
        } else {
          emptyEl.hidden = false;
          emptyEl.querySelector('h3').textContent = 'No bookings in this filter';
          emptyEl.querySelector('p').textContent = 'Try another filter to see your bookings.';
        }
        return;
      }

      emptyEl.hidden = true;

      listEl.innerHTML = list.map(function (b) {
        var itemsHtml = b.items.map(function (i) {
          return '<div class="booking-item">' +
            '<strong>' + UI.escapeHtml(i.name) + '</strong>' +
            '<span>' + i.quantity + ' × ' + UI.formatCurrency(i.price) + '</span>' +
          '</div>';
        }).join('');

        var canCancel = S.canCancel(b);

        return '' +
          '<article class="booking-card" data-booking="' + UI.escapeHtml(b.id) + '">' +
            '<div class="booking-card__head">' +
              '<div>' +
                '<span class="booking-card__id">' + UI.escapeHtml(b.id) + '</span>' +
                '<span class="booking-card__date">' + UI.formatDate(b.bookingDate) + ' · ' + UI.formatTime(b.bookingTime) + '</span>' +
              '</div>' +
              '<span class="pill ' + UI.statusClass(b.status) + ' pill--dot">' + UI.escapeHtml(b.status) + '</span>' +
            '</div>' +
            '<div class="booking-card__body">' +
              '<div class="booking-card__items">' + itemsHtml + '</div>' +
              '<div class="booking-card__meta">' +
                '<div><span>Guest</span><span>' + UI.escapeHtml(b.customerName) + '</span></div>' +
                '<div><span>Contact</span><span>' + UI.escapeHtml(b.phone || '—') + '</span></div>' +
                '<div><span>Placed</span><span>' + formatPlaced(b.createdAt) + '</span></div>' +
                '<div class="total"><span>Total</span><span>' + UI.formatCurrency(b.totalAmount) + '</span></div>' +
              '</div>' +
            '</div>' +
            ((b.notes || canCancel) ? (
              '<div class="booking-card__foot">' +
                (b.notes ? '<span class="booking-card__notes">“' + UI.escapeHtml(b.notes) + '”</span>' : '<span></span>') +
                (canCancel ? '<button class="booking-card__cancel" data-cancel="' + UI.escapeHtml(b.id) + '">Cancel booking</button>' : '') +
              '</div>'
            ) : '') +
          '</article>';
      }).join('');

      if (global.FMAnim && global.FMAnim.refresh) global.FMAnim.refresh(listEl);
    }

    function formatPlaced(iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
             ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    // Filter chips
    filterEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      activeFilter = btn.getAttribute('data-filter');
      filterEl.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('is-active', c === btn);
      });
      render();
    });

    // Cancel action
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cancel]');
      if (!btn) return;
      var id = btn.getAttribute('data-cancel');
      if (!confirm('Cancel booking ' + id + '?')) return;
      var result = S.cancelBooking(id);
      if (result.ok) UI.toast(result.message);
      else UI.toast(result.message, 'error');
    });

    // Live sync — reflects admin status updates instantly
    document.addEventListener(S.EVENTS.BOOKINGS, render);
    document.addEventListener('storage', function (e) {
      if (e.key === S.KEYS.BOOKINGS) render();
    });

    render();
  }

  /* ================================================================
     BOOT — single entry handles both pages
     ================================================================ */
  function init() {
    initBookingForm();
    initMyBookings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);