/* ============================================================
   admin.js — Provider/Admin module logic (Owner: Kanish)
   Depends on: data.js, storage.js, animations.js
   ============================================================ */

const Admin = (function () {
  'use strict';

  /* ---------- local state ---------- */
  const state = {
    statusFilter: 'All',
    bookingSearch: '',
    menuCategory: 'All',
    menuSearch: '',
    editingMenuId: null
  };

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function toast(msg, type = 'info') {
    const stack = $('#toastStack');
    if (!stack) { console.log(`[toast:${type}]`, msg); return; }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 240ms ease, transform 240ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  function statusPill(status) {
    const meta = (window.STATUS_META && window.STATUS_META[status]) || { color: '#666', bg: 'rgba(0,0,0,0.08)' };
    return `<span class="status-pill" style="color:${meta.color};background:${meta.bg};">${esc(status)}</span>`;
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  /* ---------- shell (sidebar mobile toggle + shared modal close) ---------- */
  function initShell() {
    const toggle = $('#sidebarToggle');
    const sidebar = $('#sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (window.innerWidth > 900) return;
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Universal close for any [data-close-modal]
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-close-modal]');
      if (btn) {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      }
      // clicking backdrop closes it
      if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('open');
      }
    });

    // React to cross-tab / same-tab changes
    window.addEventListener('fm:datachange', () => {
      rerenderCurrentPage();
    });
  }

  function rerenderCurrentPage() {
    const page = document.body.dataset.adminPage || detectPage();
    if (page === 'dashboard') renderDashboard();
    else if (page === 'bookings') renderBookings();
    else if (page === 'menu') renderMenuManagement();
    else if (page === 'availability') renderAvailability();
  }

  function detectPage() {
    const path = location.pathname.toLowerCase();
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('bookings')) return 'bookings';
    if (path.includes('menu-management')) return 'menu';
    if (path.includes('availability')) return 'availability';
    return '';
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function renderDashboard() {
    if (!document.getElementById('statTotal')) return;

    const bookings = window.Storage.getBookings();
    const menu = window.Storage.getMenuItems();

    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const accepted = bookings.filter(b => b.status === 'Accepted').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const value = bookings
      .filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

    setCounter('statTotal', total);
    setCounter('statPending', pending);
    setCounter('statAccepted', accepted);
    setCounter('statCompleted', completed);
    setCounter('statValue', value);

    // Status flow
    const flowEl = $('#statusFlow');
    if (flowEl) {
      const flow = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed'];
      flowEl.innerHTML = flow.map(s => {
        const count = bookings.filter(b => b.status === s).length;
        return `<div class="status-flow-step">
          <div class="n">${count}</div>
          <div class="l">${esc(s)}</div>
        </div>`;
      }).join('');
    }

    // Pending preview
    const previewEl = $('#pendingPreview');
    if (previewEl) {
      const pendingBookings = bookings.filter(b => b.status === 'Pending').slice(0, 5);
      if (!pendingBookings.length) {
        previewEl.innerHTML = `<div class="empty"><h3>All clear</h3><p>No pending bookings right now.</p></div>`;
      } else {
        previewEl.innerHTML = `
          <table class="booking-table">
            <thead><tr>
              <th>ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${pendingBookings.map(b => `
                <tr>
                  <td class="bk-id">${esc(b.id)}</td>
                  <td>${esc(b.customerName)}</td>
                  <td>${formatDate(b.bookingDate)} · ${esc(b.bookingTime || '—')}</td>
                  <td class="bk-total">${fmt(b.totalAmount)}</td>
                  <td><button class="btn btn-primary btn-xs" data-accept="${esc(b.id)}">Accept</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
        $$('[data-accept]', previewEl).forEach(btn => {
          btn.addEventListener('click', () => {
            const updated = window.Storage.updateBookingStatus(btn.dataset.accept, 'Accepted');
            if (updated) {
              toast(`${updated.id} accepted`, 'success');
              renderDashboard();
            }
          });
        });
      }
    }

    // Popular dishes
    const popularEl = $('#popularChart');
    if (popularEl) {
      const tally = {};
      bookings.forEach(b => (b.items || []).forEach(it => {
        const key = it.name || ('#' + it.foodId);
        tally[key] = (tally[key] || 0) + Number(it.quantity || 0);
      }));
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const max = sorted.length ? sorted[0][1] : 1;
      if (!sorted.length) {
        popularEl.innerHTML = `<div class="empty"><p>No orders yet — analytics will appear after the first booking.</p></div>`;
      } else {
        popularEl.innerHTML = sorted.map(([name, qty]) => `
          <div class="bar-row">
            <div class="bar-label" title="${esc(name)}">${esc(name)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((qty / max) * 100)}%"></div></div>
            <div class="bar-value">${qty}</div>
          </div>
        `).join('');
      }
    }

    // Re-run counters if reduced motion or already visible
    if (window.FMAnimations && window.FMAnimations.initCounters) {
      window.FMAnimations.initCounters();
    }
  }

  function setCounter(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    // Reset so animation plays on rerender
    el.dataset.count = String(value);
    el.textContent = el.dataset.prefix
      ? el.dataset.prefix + Number(value).toLocaleString('en-IN')
      : Number(value).toLocaleString('en-IN');
    // Animate if visible
    if (window.FMAnimations && window.FMAnimations.animateCounter) {
      window.FMAnimations.animateCounter(el);
    }
  }

  /* ============================================================
     BOOKINGS
     ============================================================ */
  function renderBookings() {
    if (!document.getElementById('bookingsTableWrap')) return;

    renderStatusChips();
    renderBookingsTable();

    const searchInput = $('#bookingSearch');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', (e) => {
        state.bookingSearch = e.target.value.trim().toLowerCase();
        renderBookingsTable();
      });
    }

    if (!document.body.dataset.bookingsBound) {
      document.body.dataset.bookingsBound = '1';
      // event delegation for all actions
      document.addEventListener('click', handleBookingAction);
    }
  }

  function renderStatusChips() {
    const wrap = $('#statusChips');
    if (!wrap) return;
    const statuses = ['All', ...(window.BOOKING_STATUSES || [])];
    wrap.innerHTML = statuses.map(s => {
      const active = state.statusFilter === s ? ' active' : '';
      return `<button class="chip${active}" data-status="${esc(s)}">${esc(s)}</button>`;
    }).join('');
    if (!wrap.dataset.bound) {
      wrap.dataset.bound = '1';
      wrap.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-status]');
        if (!chip) return;
        state.statusFilter = chip.dataset.status;
        $$('.chip', wrap).forEach(c => c.classList.toggle('active', c === chip));
        renderBookingsTable();
      });
    }
  }

  function renderBookingsTable() {
    const wrap = $('#bookingsTableWrap');
    if (!wrap) return;

    let bookings = window.Storage.getBookings();

    if (state.statusFilter !== 'All') {
      bookings = bookings.filter(b => b.status === state.statusFilter);
    }
    if (state.bookingSearch) {
      const q = state.bookingSearch;
      bookings = bookings.filter(b =>
        b.id.toLowerCase().includes(q) ||
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.contactNumber || '').toLowerCase().includes(q)
      );
    }

    // Sort newest first
    bookings.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const countEl = $('#bookingCount');
    if (countEl) countEl.textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;

    if (!bookings.length) {
      wrap.innerHTML = `<div class="empty"><h3>No bookings found</h3><p>Try a different filter or search query.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="booking-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Date · Time</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => renderBookingRow(b)).join('')}
        </tbody>
      </table>`;
  }

  function renderBookingRow(b) {
    const itemsList = (b.items || []).map(it =>
      `<li>${esc(it.name)} <span>×${it.quantity} · ${fmt(it.price)}</span></li>`
    ).join('');

    return `
      <tr data-booking-row="${esc(b.id)}">
        <td><span class="bk-id">${esc(b.id)}</span><br><span class="text-muted" style="font-size:0.72rem;">${formatDateTime(b.createdAt)}</span></td>
        <td>
          <strong>${esc(b.customerName)}</strong><br>
          <span class="text-muted" style="font-size:0.78rem;">${esc(b.contactNumber || '—')}</span>
        </td>
        <td><ul class="bk-items">${itemsList || '<li>—</li>'}</ul></td>
        <td>${formatDate(b.bookingDate)}<br><span class="text-muted" style="font-size:0.78rem;">${esc(b.bookingTime || '—')}</span></td>
        <td class="bk-total">${fmt(b.totalAmount)}</td>
        <td>${statusPill(b.status)}</td>
        <td>
          <div class="bk-actions">
            ${actionButtons(b)}
            <button class="btn btn-ghost btn-xs" data-view="${esc(b.id)}">Details</button>
          </div>
        </td>
      </tr>`;
  }

  function actionButtons(b) {
    const s = b.status;
    const out = [];
    if (s === 'Pending') {
      out.push(`<button class="btn btn-primary btn-xs" data-action="Accepted" data-id="${esc(b.id)}">Accept</button>`);
      out.push(`<button class="btn btn-danger btn-xs" data-action="Rejected" data-id="${esc(b.id)}">Reject</button>`);
    } else if (s === 'Accepted') {
      out.push(`<button class="btn btn-primary btn-xs" data-action="Preparing" data-id="${esc(b.id)}">Preparing</button>`);
      out.push(`<button class="btn btn-danger btn-xs" data-action="Cancelled" data-id="${esc(b.id)}">Cancel</button>`);
    } else if (s === 'Preparing') {
      out.push(`<button class="btn btn-primary btn-xs" data-action="Ready" data-id="${esc(b.id)}">Mark Ready</button>`);
    } else if (s === 'Ready') {
      out.push(`<button class="btn btn-gold btn-xs" data-action="Completed" data-id="${esc(b.id)}">Complete</button>`);
    }
    return out.join('');
  }

  function handleBookingAction(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn && actionBtn.dataset.id) {
      const { id, action } = actionBtn.dataset;
      const updated = window.Storage.updateBookingStatus(id, action);
      if (updated) {
        toast(`${updated.id} → ${action}`, 'success');
        if (detectPage() === 'dashboard') renderDashboard();
        else renderBookingsTable();
      } else {
        toast('Could not update booking', 'error');
      }
      return;
    }

    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn && viewBtn.dataset.view) {
      openBookingModal(viewBtn.dataset.view);
      return;
    }
  }

  function openBookingModal(id) {
    const bookings = window.Storage.getBookings();
    const b = bookings.find(x => x.id === id);
    const modal = $('#detailModal');
    if (!b || !modal) return;

    const body = $('#detailBody');
    $('#detailTitle').textContent = `Booking ${b.id}`;

    const itemsRows = (b.items || []).map(it => `
      <tr>
        <td>${esc(it.name)}</td>
        <td style="text-align:center;">${it.quantity}</td>
        <td style="text-align:right;">${fmt(it.price)}</td>
        <td style="text-align:right;">${fmt(it.price * it.quantity)}</td>
      </tr>`).join('');

    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-4);margin-bottom:var(--s-4);">
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Customer</div><div style="font-weight:600;margin-top:2px;">${esc(b.customerName)}</div></div>
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Contact</div><div style="margin-top:2px;">${esc(b.contactNumber || '—')}</div></div>
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Date</div><div style="margin-top:2px;">${formatDate(b.bookingDate)}</div></div>
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Time</div><div style="margin-top:2px;">${esc(b.bookingTime || '—')}</div></div>
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Status</div><div style="margin-top:2px;">${statusPill(b.status)}</div></div>
        <div><div class="text-muted" style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Created</div><div style="margin-top:2px;">${formatDateTime(b.createdAt)}</div></div>
      </div>
      <table class="booking-table" style="margin-bottom:var(--s-4);">
        <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Subtotal</th></tr></thead>
        <tbody>${itemsRows || '<tr><td colspan="4">No items</td></tr>'}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--s-3);border-top:1px solid var(--line);">
        <span class="text-muted">Total</span>
        <span class="text-serif" style="font-size:1.4rem;color:var(--forest);">${fmt(b.totalAmount)}</span>
      </div>
    `;
    modal.classList.add('open');
  }

  /* ============================================================
     MENU MANAGEMENT
     ============================================================ */
  function renderMenuManagement() {
    if (!document.getElementById('menuGrid')) return;

    renderCategoryChips();
    renderMenuGrid();

    const searchInput = $('#menuSearch');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', (e) => {
        state.menuSearch = e.target.value.trim().toLowerCase();
        renderMenuGrid();
      });
    }

    const addBtn = $('#addMenuItemBtn');
    if (addBtn && !addBtn.dataset.bound) {
      addBtn.dataset.bound = '1';
      addBtn.addEventListener('click', () => openMenuModal(null));
    }

    const saveBtn = $('#menuSaveBtn');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', submitMenuForm);
    }

    const availToggle = $('#menuAvailToggle');
    const availCheck = $('#menuAvailable');
    if (availToggle && availCheck && !availToggle.dataset.bound) {
      availToggle.dataset.bound = '1';
      availToggle.addEventListener('click', () => {
        availCheck.checked = !availCheck.checked;
        availToggle.classList.toggle('on', availCheck.checked);
      });
    }

    const catSelect = $('#menuCategory');
    if (catSelect && !catSelect.options.length) {
      catSelect.innerHTML = (window.FOOD_CATEGORIES || []).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    }

    // Event delegation for card actions
    if (!document.body.dataset.menuBound) {
      document.body.dataset.menuBound = '1';
      document.addEventListener('click', handleMenuAction);
    }
  }

  function renderCategoryChips() {
    const wrap = $('#categoryChips');
    if (!wrap) return;
    const cats = ['All', ...(window.FOOD_CATEGORIES || [])];
    wrap.innerHTML = cats.map(c => {
      const active = state.menuCategory === c ? ' active' : '';
      return `<button class="chip${active}" data-cat="${esc(c)}">${esc(c)}</button>`;
    }).join('');
    if (!wrap.dataset.bound) {
      wrap.dataset.bound = '1';
      wrap.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cat]');
        if (!chip) return;
        state.menuCategory = chip.dataset.cat;
        $$('.chip', wrap).forEach(c => c.classList.toggle('active', c === chip));
        renderMenuGrid();
      });
    }
  }

  function renderMenuGrid() {
    const grid = $('#menuGrid');
    if (!grid) return;

    let items = window.Storage.getMenuItems();
    if (state.menuCategory !== 'All') {
      items = items.filter(i => i.category === state.menuCategory);
    }
    if (state.menuSearch) {
      const q = state.menuSearch;
      items = items.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }

    if (!items.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1;"><h3>No dishes match</h3><p>Try a different search or add a new dish.</p></div>`;
      return;
    }

    grid.innerHTML = items.map(i => `
      <article class="menu-admin-card reveal" data-id="${i.id}">
        <div class="menu-admin-thumb">
          <img src="${esc(i.image || '')}" alt="${esc(i.name)}" loading="lazy" onerror="this.style.opacity=0.15;">
        </div>
        <div class="menu-admin-body">
          <div class="menu-admin-cat">${esc(i.category)}</div>
          <div class="menu-admin-name">${esc(i.name)}</div>
          <div class="menu-admin-desc">${esc(i.description || 'No description')}</div>
          <div class="menu-admin-price">${fmt(i.price)}</div>
          <label class="availability-toggle" style="margin-bottom:var(--s-3);">
            <span class="toggle-switch ${i.available ? 'on' : ''}" data-toggle-avail="${i.id}"></span>
            <span>${i.available ? 'Available' : 'Unavailable'}</span>
          </label>
          <div class="menu-admin-actions">
            <button class="btn btn-ghost btn-xs" data-edit="${i.id}">Edit</button>
            <button class="btn btn-danger btn-xs" data-delete="${i.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join('');

    if (window.FMAnimations) window.FMAnimations.initReveals();
  }

  function handleMenuAction(e) {
    const toggle = e.target.closest('[data-toggle-avail]');
    if (toggle) {
      const id = Number(toggle.dataset.toggleAvail);
      const updated = window.Storage.toggleMenuItemAvailability(id);
      if (updated) {
        toast(`${updated.name} → ${updated.available ? 'Available' : 'Unavailable'}`, 'success');
        renderMenuGrid();
        renderAvailability();
      }
      return;
    }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      openMenuModal(Number(editBtn.dataset.edit));
      return;
    }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.delete);
      const item = window.Storage.getMenuItemById(id);
      if (!item) return;
      if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
      window.Storage.deleteMenuItem(id);
      toast(`Deleted ${item.name}`, 'success');
      renderMenuGrid();
      renderAvailability();
      return;
    }
  }

  function openMenuModal(id) {
    const modal = $('#menuModal');
    if (!modal) return;
    state.editingMenuId = id;

    const title = $('#menuModalTitle');
    const form = $('#menuForm');
    const availCheck = $('#menuAvailable');
    const availToggle = $('#menuAvailToggle');

    if (id == null) {
      title.textContent = 'Add Dish';
      $('#menuId').value = '';
      form.reset();
      $('#menuCategory').value = (window.FOOD_CATEGORIES || ['Mains'])[0];
      availCheck.checked = true;
      availToggle.classList.add('on');
    } else {
      const item = window.Storage.getMenuItemById(id);
      if (!item) return;
      title.textContent = `Edit — ${item.name}`;
      $('#menuId').value = item.id;
      $('#menuName').value = item.name;
      $('#menuCategory').value = item.category;
      $('#menuPrice').value = item.price;
      $('#menuImage').value = item.image || '';
      $('#menuDescription').value = item.description || '';
      availCheck.checked = item.available !== false;
      availToggle.classList.toggle('on', availCheck.checked);
    }

    modal.classList.add('open');
    setTimeout(() => $('#menuName').focus(), 120);
  }

  function submitMenuForm() {
    const name = $('#menuName').value.trim();
    const category = $('#menuCategory').value;
    const price = Number($('#menuPrice').value);
    const image = $('#menuImage').value.trim();
    const description = $('#menuDescription').value.trim();
    const available = $('#menuAvailable').checked;

    if (!name) return toast('Please enter a dish name', 'error');
    if (!category) return toast('Please select a category', 'error');
    if (!price || price <= 0) return toast('Please enter a valid price', 'error');

    const payload = { name, category, price, image, description, available };

    if (state.editingMenuId != null) {
      const updated = window.Storage.updateMenuItem(state.editingMenuId, payload);
      if (updated) toast(`Updated ${updated.name}`, 'success');
    } else {
      const created = window.Storage.addMenuItem(payload);
      if (created) toast(`Added ${created.name}`, 'success');
    }

    $('#menuModal').classList.remove('open');
    state.editingMenuId = null;
    renderMenuGrid();
    renderAvailability();
  }

  /* ============================================================
     AVAILABILITY PAGE
     ============================================================ */
  function renderAvailability() {
    const wrap = $('#availabilityTableWrap');
    if (!wrap) return;

    const items = window.Storage.getMenuItems();
    const availableCount = items.filter(i => i.available).length;
    const summary = $('#availSummary');
    if (summary) summary.textContent = `${availableCount} of ${items.length} available`;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty"><h3>No dishes</h3><p>Add dishes in Menu Management first.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="booking-table">
        <thead>
          <tr>
            <th>Dish</th><th>Category</th><th>Price</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:var(--s-3);">
                  <img src="${esc(i.image || '')}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" onerror="this.style.opacity=0.15;">
                  <span style="font-weight:500;">${esc(i.name)}</span>
                </div>
              </td>
              <td>${esc(i.category)}</td>
              <td class="bk-total">${fmt(i.price)}</td>
              <td>${i.available ? statusPill('Accepted').replace('Accepted','Available') : statusPill('Cancelled').replace('Cancelled','Unavailable')}</td>
              <td>
                <label class="availability-toggle">
                  <span class="toggle-switch ${i.available ? 'on' : ''}" data-toggle-avail="${i.id}"></span>
                  <span>${i.available ? 'On' : 'Off'}</span>
                </label>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    const allBtn = $('#markAllAvailable');
    if (allBtn && !allBtn.dataset.bound) {
      allBtn.dataset.bound = '1';
      allBtn.addEventListener('click', () => {
        const items2 = window.Storage.getMenuItems();
        items2.forEach(i => {
          if (!i.available) window.Storage.updateMenuItem(i.id, { available: true });
        });
        toast('All dishes marked available', 'success');
        renderAvailability();
      });
    }
  }

  /* ---------- public API ---------- */
  return {
    initShell,
    renderDashboard,
    renderBookings,
    renderMenuManagement,
    renderAvailability,
    toast
  };
})();