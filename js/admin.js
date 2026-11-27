/* =========================================================================
   admin.js — MODULE B LOGIC
   Owner: KANISH
   -------------------------------------------------------------------------
   Detects which admin page is loaded and wires it up. All reads/writes go
   through FMStorage (the shared contract), so every action is instantly
   reflected on the customer side via custom events.

   Pages:
     dashboard.html         → stat cards, chart, popular dishes, recent list
     bookings.html          → full booking table + status actions
     menu-management.html   → CRUD grid + add/edit modal + delete
     availability.html      → per-dish availability toggles
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.FMStorage;
  var UI = global.FMUI;

  /* ================================================================
     SHELL — runs on every admin page
     ================================================================ */
  function initShell() {
    // Active sidebar link
    var file = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    document.querySelectorAll('[data-admin-nav]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (href === file) a.classList.add('is-active');
    });

    // Mobile sidebar toggle
    var shell = document.querySelector('.admin-shell');
    var toggle = document.getElementById('adminNavToggle');
    if (toggle && shell) {
      toggle.addEventListener('click', function () {
        var open = shell.classList.toggle('is-nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Live clock
    var clock = document.getElementById('adminClock');
    if (clock) {
      var updateClock = function () {
        var now = new Date();
        clock.textContent = now.toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short'
        }) + ' · ' + now.toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit'
        });
      };
      updateClock();
      setInterval(updateClock, 30000);
    }

    // Footer year
    var year = document.getElementById('adminYear');
    if (year) year.textContent = new Date().getFullYear();

    // Pending badge in sidebar
    refreshPendingBadge();
    document.addEventListener(S.EVENTS.BOOKINGS, refreshPendingBadge);
  }

  function refreshPendingBadge() {
    var badge = document.getElementById('navPendingCount');
    if (!badge) return;
    var count = S.getBookings().filter(function (b) {
      return b.status === S.STATUS.PENDING;
    }).length;
    badge.textContent = String(count);
    badge.classList.toggle('is-visible', count > 0);
  }

  /* ================================================================
     DASHBOARD
     ================================================================ */
  function initDashboard() {
    var stats = {
      total: document.getElementById('statTotal'),
      pending: document.getElementById('statPending'),
      accepted: document.getElementById('statAccepted'),
      completed: document.getElementById('statCompleted'),
      value: document.getElementById('statValue')
    };
    if (!stats.total) return;

    var chartEl = document.getElementById('weeklyChart');
    var popularEl = document.getElementById('popularList');
    var recentEl = document.getElementById('recentBookings');
    var totalHint = document.getElementById('statTotalHint');

    function render() {
      var bookings = S.getBookings();

      // Stat values
      var total = bookings.length;
      var pending = bookings.filter(function (b) { return b.status === S.STATUS.PENDING; }).length;
      var accepted = bookings.filter(function (b) {
        return b.status === S.STATUS.ACCEPTED ||
               b.status === S.STATUS.PREPARING ||
               b.status === S.STATUS.READY;
      }).length;
      var completed = bookings.filter(function (b) { return b.status === S.STATUS.COMPLETED; }).length;
      var totalValue = bookings.filter(function (b) {
        return b.status !== S.STATUS.CANCELLED && b.status !== S.STATUS.REJECTED;
      }).reduce(function (sum, b) { return sum + (Number(b.totalAmount) || 0); }, 0);

      setCounter(stats.total, total);
      setCounter(stats.pending, pending);
      setCounter(stats.accepted, accepted);
      setCounter(stats.completed, completed);
      setCounter(stats.value, totalValue, '₹');

      if (totalHint) {
        totalHint.textContent = total ? total + ' lifetime' : 'No bookings yet';
      }

      renderChart(bookings);
      renderPopular(bookings);
      renderRecent(bookings);
    }

    function setCounter(el, value, prefix) {
      if (!el) return;
      // Re-trigger the animation if the value changed
      var current = Number(el.getAttribute('data-counter'));
      if (current === value) return;
      el.setAttribute('data-counter', String(value));
      el.setAttribute('data-counted', '');
      el.removeAttribute('data-counted');
      if (prefix) el.setAttribute('data-prefix', prefix);
      el.textContent = prefix ? prefix + '0' : '0';
      if (global.FMAnim && global.FMAnim.initCounters) {
        global.FMAnim.initCounters(el.parentElement);
      }
    }

    function renderChart(bookings) {
      if (!chartEl) return;

      var days = [];
      var today = new Date();
      today.setHours(0, 0, 0, 0);

      for (var i = 6; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(d.getDate() - i);
        var iso = d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0');
        days.push({
          iso: iso,
          label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
          count: 0,
          isToday: i === 0
        });
      }

      var lookup = {};
      days.forEach(function (d) { lookup[d.iso] = d; });

      bookings.forEach(function (b) {
        var created = (b.createdAt || '').slice(0, 10);
        if (lookup[created]) lookup[created].count++;
      });

      var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.count; })));

      chartEl.innerHTML = days.map(function (d) {
        var heightPct = d.count === 0 ? 4 : Math.max(8, (d.count / max) * 100);
        return '<div class="chart__bar-wrap' + (d.count === 0 ? ' is-empty' : '') + '">' +
          '<span class="chart__value">' + d.count + '</span>' +
          '<div class="chart__bar' + (d.isToday ? ' is-today' : '') + '" style="height:' + heightPct + '%"></div>' +
          '<span class="chart__label' + (d.isToday ? ' is-today' : '') + '">' + d.label + '</span>' +
        '</div>';
      }).join('');
    }

    function renderPopular(bookings) {
      if (!popularEl) return;
      var counts = {};
      bookings.forEach(function (b) {
        (b.items || []).forEach(function (i) {
          var key = i.name || 'Unknown';
          counts[key] = (counts[key] || 0) + (Number(i.quantity) || 0);
        });
      });

      var sorted = Object.keys(counts)
        .map(function (k) { return { name: k, qty: counts[k] }; })
        .sort(function (a, b) { return b.qty - a.qty; })
        .slice(0, 5);

      if (!sorted.length) {
        popularEl.innerHTML = '<li class="popular-empty">No orders yet.</li>';
        return;
      }

      var maxQty = sorted[0].qty;

      popularEl.innerHTML = sorted.map(function (item, i) {
        var widthPct = Math.max(8, (item.qty / maxQty) * 100);
        return '<li class="popular-item">' +
          '<span class="popular-item__rank">' + (i + 1) + '</span>' +
          '<div class="popular-item__body">' +
            '<div class="popular-item__name">' + UI.escapeHtml(item.name) + '</div>' +
            '<div class="popular-item__bar"><span style="width:' + widthPct + '%"></span></div>' +
          '</div>' +
          '<span class="popular-item__count">' + item.qty + '</span>' +
        '</li>';
      }).join('');
    }

    function renderRecent(bookings) {
      if (!recentEl) return;
      var recent = bookings.slice()
        .sort(function (a, b) {
          return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        })
        .slice(0, 5);

      if (!recent.length) {
        recentEl.innerHTML = '<div class="recent-empty">No bookings yet — they\'ll appear here as customers place orders.</div>';
        return;
      }

      recentEl.innerHTML = recent.map(function (b) {
        return '<a class="recent-item" href="bookings.html">' +
          '<span class="recent-item__id">' + UI.escapeHtml(b.id) + '</span>' +
          '<span class="recent-item__customer">' + UI.escapeHtml(b.customerName) + ' · ' +
            '<span class="pill ' + UI.statusClass(b.status) + '">' + UI.escapeHtml(b.status) + '</span></span>' +
          '<span class="recent-item__when">' + UI.formatDate(b.bookingDate) + ' · ' + UI.formatTime(b.bookingTime) + '</span>' +
          '<span class="recent-item__total">' + UI.formatCurrency(b.totalAmount) + '</span>' +
        '</a>';
      }).join('');
    }

    render();
    document.addEventListener(S.EVENTS.BOOKINGS, render);
  }

  /* ================================================================
     BOOKINGS PAGE
     ================================================================ */
  function initBookings() {
    var tbody = document.getElementById('bookingsTbody');
    if (!tbody) return;

    var emptyEl = document.getElementById('bookingsEmpty');
    var searchInput = document.getElementById('bookingSearch');
    var filtersEl = document.getElementById('bookingFilters');

    var state = { filter: 'all', query: '' };

    function matches(b) {
      if (state.filter !== 'all') {
        if (state.filter === 'Cancelled') {
          if (b.status !== S.STATUS.CANCELLED && b.status !== S.STATUS.REJECTED) return false;
        } else if (b.status !== state.filter) {
          return false;
        }
      }
      var q = state.query.trim().toLowerCase();
      if (!q) return true;
      var haystack = b.id + ' ' + b.customerName + ' ' + (b.phone || '') + ' ' +
        (b.items || []).map(function (i) { return i.name; }).join(' ');
      return haystack.toLowerCase().indexOf(q) !== -1;
    }

    // ---------- Status transition rules ----------
    function actionsFor(b) {
      switch (b.status) {
        case S.STATUS.PENDING:
          return [
            { label: 'Accept', next: S.STATUS.ACCEPTED, cls: 'bk-action--accept' },
            { label: 'Reject', next: S.STATUS.REJECTED, cls: 'bk-action--reject' }
          ];
        case S.STATUS.ACCEPTED:
          return [{ label: 'Start preparing', next: S.STATUS.PREPARING, cls: '' }];
        case S.STATUS.PREPARING:
          return [{ label: 'Mark ready', next: S.STATUS.READY, cls: '' }];
        case S.STATUS.READY:
          return [{ label: 'Mark completed', next: S.STATUS.COMPLETED, cls: 'bk-action--accept' }];
        default:
          return [];
      }
    }

    function render() {
      var all = S.getBookings().slice().sort(function (a, b) {
        var aKey = (a.createdAt || '') + '|' + a.id;
        var bKey = (b.createdAt || '') + '|' + b.id;
        return bKey.localeCompare(aKey);
      });
      var list = all.filter(matches);

      if (!list.length) {
        tbody.innerHTML = '';
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;

      tbody.innerHTML = list.map(function (b) {
        var itemsHtml = (b.items || []).map(function (i) {
          return '<span><em>' + i.quantity + '×</em>' + UI.escapeHtml(i.name) + '</span>';
        }).join('');

        var actions = actionsFor(b);
        var actionsHtml = actions.length
          ? actions.map(function (a) {
              return '<button class="bk-action ' + a.cls + '" data-action="' + a.next +
                     '" data-booking="' + UI.escapeHtml(b.id) + '">' + a.label + '</button>';
            }).join('')
          : '<span class="bk-actions--empty">No actions</span>';

        return '<tr data-booking-row="' + UI.escapeHtml(b.id) + '">' +
          '<td><span class="bk-id">' + UI.escapeHtml(b.id) + '</span></td>' +
          '<td>' +
            '<div class="bk-customer">' +
              '<strong>' + UI.escapeHtml(b.customerName) + '</strong>' +
              '<small>' + UI.escapeHtml(b.phone || '—') + '</small>' +
            '</div>' +
          '</td>' +
          '<td><div class="bk-items">' + itemsHtml + '</div></td>' +
          '<td>' +
            '<div class="bk-when">' +
              '<strong>' + UI.formatDate(b.bookingDate) + '</strong>' +
              '<small>' + UI.formatTime(b.bookingTime) + '</small>' +
            '</div>' +
          '</td>' +
          '<td><span class="bk-total">' + UI.formatCurrency(b.totalAmount) + '</span></td>' +
          '<td><span class="pill ' + UI.statusClass(b.status) + ' pill--dot">' + UI.escapeHtml(b.status) + '</span></td>' +
          '<td><div class="bk-actions">' + actionsHtml + '</div></td>' +
        '</tr>';
      }).join('');
    }

    // Filter chips
    filtersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      state.filter = btn.getAttribute('data-filter');
      filtersEl.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('is-active', c === btn);
      });
      render();
    });

    // Search
    var debounceId;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceId);
      debounceId = setTimeout(function () {
        state.query = searchInput.value;
        render();
      }, 160);
    });

    // Status actions
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var bookingId = btn.getAttribute('data-booking');
      var nextStatus = btn.getAttribute('data-action');

      if (nextStatus === S.STATUS.REJECTED) {
        if (!confirm('Reject booking ' + bookingId + '? This cannot be undone.')) return;
      }

      var updated = S.updateBookingStatus(bookingId, nextStatus);
      if (updated) {
        UI.toast('Booking ' + bookingId + ' → ' + nextStatus);
      } else {
        UI.toast('Could not update booking.', 'error');
      }
    });

    // Live sync
    document.addEventListener(S.EVENTS.BOOKINGS, render);
    document.addEventListener('storage', function (e) {
      if (e.key === S.KEYS.BOOKINGS) render();
    });

    render();
  }

  /* ================================================================
     MENU MANAGEMENT
     ================================================================ */
  function initMenuManagement() {
    var grid = document.getElementById('menuAdminGrid');
    if (!grid) return;

    var emptyEl = document.getElementById('menuEmpty');
    var catFilters = document.getElementById('menuCatFilters');
    var addBtn = document.getElementById('addDishBtn');
    var emptyAddBtn = document.getElementById('emptyAddBtn');

    var modal = document.getElementById('dishModal');
    var form = document.getElementById('dishForm');
    var modalTitle = document.getElementById('dishModalTitle');

    var state = { category: 'all' };

    // ---------- Filters ----------
    function renderCatFilters() {
      var cats = S.getCategories();
      var html = '<button class="chip' + (state.category === 'all' ? ' is-active' : '') + '" data-cat="all">All</button>';
      html += cats.map(function (c) {
        var active = state.category === c ? ' is-active' : '';
        return '<button class="chip' + active + '" data-cat="' + UI.escapeHtml(c) + '">' + UI.escapeHtml(c) + '</button>';
      }).join('');
      catFilters.innerHTML = html;

      // Also fill the datalist in the modal
      var datalist = document.getElementById('categoryList');
      if (datalist) {
        datalist.innerHTML = cats.map(function (c) {
          return '<option value="' + UI.escapeHtml(c) + '"></option>';
        }).join('');
      }
    }

    // ---------- Render grid ----------
    function render() {
      var menu = S.getMenu();
      var list = state.category === 'all' ? menu : menu.filter(function (f) {
        return f.category === state.category;
      });

      if (!list.length) {
        grid.innerHTML = '';
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;

      grid.innerHTML = list.map(function (item) {
        var status = item.available === false
          ? '<span class="menu-admin-card__status is-off">Sold out</span>'
          : '<span class="menu-admin-card__status is-on">Available</span>';

        return '' +
          '<article class="menu-admin-card" data-food="' + item.id + '">' +
            '<div class="menu-admin-card__media">' +
              status +
              '<img src="' + UI.escapeHtml(item.image) + '" alt="' + UI.escapeHtml(item.name) + '" onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div class="menu-admin-card__body">' +
              '<div class="menu-admin-card__meta">' +
                '<span class="menu-admin-card__cat">' + UI.escapeHtml(item.category) + '</span>' +
                '<span class="menu-admin-card__price">' + UI.formatCurrency(item.price) + '</span>' +
              '</div>' +
              '<div class="menu-admin-card__name">' + UI.escapeHtml(item.name) + '</div>' +
              '<p class="menu-admin-card__desc">' + UI.escapeHtml(item.description) + '</p>' +
              '<div class="menu-admin-card__foot">' +
                '<button class="bk-action" data-edit="' + item.id + '">Edit</button>' +
                '<button class="bk-action bk-action--reject" data-delete="' + item.id + '">Delete</button>' +
              '</div>' +
            '</div>' +
          '</article>';
      }).join('');
    }

    // ---------- Modal ----------
    function openModal(item) {
      modalTitle.textContent = item ? 'Edit dish' : 'New dish';
      document.getElementById('dishId').value = item ? item.id : '';
      document.getElementById('dishName').value = item ? item.name : '';
      document.getElementById('dishDescription').value = item ? item.description : '';
      document.getElementById('dishCategory').value = item ? item.category : '';
      document.getElementById('dishPrice').value = item ? item.price : '';
      document.getElementById('dishImage').value = item ? item.image : '';
      document.getElementById('dishAvailable').checked = item ? item.available !== false : true;
      document.getElementById('dishFeatured').checked = item ? item.featured === true : false;

      // Clear errors
      form.querySelectorAll('.field__error').forEach(function (el) {
        el.textContent = '';
        el.classList.remove('is-visible');
      });
      form.querySelectorAll('.has-error').forEach(function (el) {
        el.classList.remove('has-error');
      });

      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');

      // Focus first field
      setTimeout(function () {
        document.getElementById('dishName').focus();
      }, 50);
    }

    function closeModal() {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }

    function showError(fieldName, message) {
      var input = document.getElementById(fieldName);
      var errEl = form.querySelector('[data-err="' + fieldName + '"]');
      if (input) input.closest('.field').classList.toggle('has-error', !!message);
      if (errEl) {
        errEl.textContent = message || '';
        errEl.classList.toggle('is-visible', !!message);
      }
    }

    function validateForm() {
      var name = document.getElementById('dishName').value.trim();
      var category = document.getElementById('dishCategory').value.trim();
      var price = Number(document.getElementById('dishPrice').value);

      var ok = true;
      showError('dishName', '');
      showError('dishCategory', '');
      showError('dishPrice', '');
      showError('general', '');

      if (!name) { showError('dishName', 'A name is required.'); ok = false; }
      if (!category) { showError('dishCategory', 'A category is required.'); ok = false; }
      if (!price || price <= 0) { showError('dishPrice', 'Price must be greater than 0.'); ok = false; }

      return ok;
    }

    function handleSave(e) {
      e.preventDefault();
      if (!validateForm()) return;

      var id = document.getElementById('dishId').value;
      var payload = {
        name: document.getElementById('dishName').value.trim(),
        description: document.getElementById('dishDescription').value.trim(),
        category: document.getElementById('dishCategory').value.trim(),
        price: Number(document.getElementById('dishPrice').value),
        image: document.getElementById('dishImage').value.trim() ||
               'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
        available: document.getElementById('dishAvailable').checked,
        featured: document.getElementById('dishFeatured').checked,
        tags: []
      };

      try {
        if (id) {
          S.updateMenuItem(Number(id), payload);
          UI.toast('Dish updated.');
        } else {
          S.addMenuItem(payload);
          UI.toast('Dish added to menu.');
        }
      } catch (err) {
        showError('general', err.message || 'Could not save dish.');
        return;
      }

      closeModal();
      renderCatFilters();
      render();
    }

    // ---------- Events ----------
    catFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.category = btn.getAttribute('data-cat');
      renderCatFilters();
      render();
    });

    if (addBtn) addBtn.addEventListener('click', function () { openModal(null); });
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', function () { openModal(null); });

    grid.addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-edit]');
      if (editBtn) {
        var item = S.getFoodItem(Number(editBtn.getAttribute('data-edit')));
        if (item) openModal(item);
        return;
      }
      var delBtn = e.target.closest('[data-delete]');
      if (delBtn) {
        var id = Number(delBtn.getAttribute('data-delete'));
        var dish = S.getFoodItem(id);
        if (!dish) return;
        if (!confirm('Delete "' + dish.name + '" from the menu? This cannot be undone.')) return;
        S.deleteMenuItem(id);
        UI.toast('"' + dish.name + '" removed.');
        renderCatFilters();
        render();
      }
    });

    form.addEventListener('submit', handleSave);

    document.getElementById('dishModalClose').addEventListener('click', closeModal);
    document.getElementById('dishCancel').addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
      // Click on backdrop (outside form) closes
      if (e.target === modal) closeModal();
    });

    document.addEventListener(S.EVENTS.MENU, function () {
      renderCatFilters();
      render();
    });

    // ---------- Boot ----------
    renderCatFilters();
    render();
  }

  /* ================================================================
     AVAILABILITY PAGE
     ================================================================ */
  function initAvailability() {
    var listEl = document.getElementById('availabilityList');
    if (!listEl) return;

    var allOnBtn = document.getElementById('setAllAvailable');
    var allOffBtn = document.getElementById('setAllUnavailable');

    function render() {
      var menu = S.getMenu();
      if (!menu.length) {
        listEl.innerHTML = '<div class="recent-empty">No dishes on the menu yet.</div>';
        return;
      }

      listEl.innerHTML = menu.map(function (item) {
        var on = item.available !== false;
        return '' +
          '<div class="availability-item" data-food="' + item.id + '">' +
            '<div class="availability-item__thumb">' +
              '<img src="' + UI.escapeHtml(item.image) + '" alt="" onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div class="availability-item__body">' +
              '<div class="availability-item__name">' + UI.escapeHtml(item.name) + '</div>' +
              '<div class="availability-item__meta">' + UI.escapeHtml(item.category) + ' · ' +
                UI.formatCurrency(item.price) + '</div>' +
            '</div>' +
            '<label class="toggle">' +
              '<input type="checkbox" data-toggle' + (on ? ' checked' : '') + '>' +
              '<span class="toggle__track"></span>' +
              '<span class="toggle__label">' + (on ? 'Available' : 'Sold out') + '</span>' +
            '</label>' +
          '</div>';
      }).join('');
    }

    listEl.addEventListener('change', function (e) {
      var checkbox = e.target.closest('[data-toggle]');
      if (!checkbox) return;
      var row = checkbox.closest('[data-food]');
      var id = Number(row.getAttribute('data-food'));
      var item = S.getFoodItem(id);
      if (!item) return;

      S.toggleAvailability(id);
      var newState = item.available === false; // toggled
      UI.toast('"' + item.name + '" is now ' + (newState ? 'available' : 'sold out') + '.');

      // Update label in place
      var label = row.querySelector('.toggle__label');
      if (label) label.textContent = newState ? 'Available' : 'Sold out';
    });

    if (allOnBtn) {
      allOnBtn.addEventListener('click', function () {
        if (!confirm('Mark every dish as available?')) return;
        S.getMenu().forEach(function (item) {
          if (item.available === false) S.toggleAvailability(item.id);
        });
        UI.toast('All dishes marked available.');
        render();
      });
    }

    if (allOffBtn) {
      allOffBtn.addEventListener('click', function () {
        if (!confirm('Mark every dish as sold out?')) return;
        S.getMenu().forEach(function (item) {
          if (item.available !== false) S.toggleAvailability(item.id);
        });
        UI.toast('All dishes marked sold out.');
        render();
      });
    }

    document.addEventListener(S.EVENTS.MENU, render);

    render();
  }

  /* ================================================================
     BOOT — route by presence of page-specific roots
     ================================================================ */
  function init() {
    initShell();

    if (document.getElementById('adminDashboard')) initDashboard();
    if (document.getElementById('adminBookings')) initBookings();
    if (document.getElementById('adminMenu')) initMenuManagement();
    if (document.getElementById('adminAvailability')) initAvailability();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);