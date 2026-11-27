/* =========================================================================
   storage.js — SHARED DATA LAYER
   Owners: Arsh + Kanish
   ========================================================================= */
(function (global) {
  'use strict';

  var KEYS = {
    MENU: 'fm_menu_v1',
    BOOKINGS: 'fm_bookings_v1',
    CART: 'fm_cart_v1',
    SEQ: 'fm_booking_seq_v1',
    SEED: 'fm_seed_version_v1'
  };

  var SEED_VERSION = '1.0.0';

  var EVENTS = {
    MENU: 'fm:menu-changed',
    BOOKINGS: 'fm:bookings-changed',
    CART: 'fm:cart-changed'
  };

  var STATUS = Object.freeze({
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected'
  });

  var ACTIVE_STATUSES = [
    STATUS.PENDING, STATUS.ACCEPTED, STATUS.PREPARING, STATUS.READY
  ];

  var CANCELLABLE_STATUSES = [STATUS.PENDING, STATUS.ACCEPTED];

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      var parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) return fallback;
      return parsed;
    } catch (err) {
      console.warn('[FMStorage] Corrupted data in "' + key + '", using fallback.', err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[FMStorage] Could not write "' + key + '".', err);
      return false;
    }
  }

  function emit(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail: detail || null }));
  }

  global.addEventListener('storage', function (e) {
    if (e.key === KEYS.MENU) emit(EVENTS.MENU);
    else if (e.key === KEYS.BOOKINGS) emit(EVENTS.BOOKINGS);
    else if (e.key === KEYS.CART) emit(EVENTS.CART);
  });

  /* ---------- MENU ---------- */
  function getMenu() {
    var menu = read(KEYS.MENU, []);
    if (!Array.isArray(menu)) return [];
    return menu
      .filter(function (f) { return f && typeof f === 'object'; })
      .map(function (f) {
        return {
          id: Number(f.id),
          name: String(f.name || 'Untitled dish'),
          description: String(f.description || ''),
          price: Number(f.price) || 0,
          category: String(f.category || 'Mains'),
          image: String(f.image || ''),
          available: f.available !== false,
          featured: f.featured === true,
          tags: Array.isArray(f.tags) ? f.tags : []
        };
      });
  }

  function saveMenu(items) {
    var ok = write(KEYS.MENU, Array.isArray(items) ? items : []);
    emit(EVENTS.MENU);
    return ok;
  }

  function getFoodItem(id) {
    var numericId = Number(id);
    return getMenu().filter(function (f) { return f.id === numericId; })[0] || null;
  }

  function addMenuItem(data) {
    var menu = getMenu();
    var nextId = menu.reduce(function (max, f) { return Math.max(max, f.id); }, 0) + 1;
    var item = {
      id: nextId,
      name: String(data.name || 'New dish'),
      description: String(data.description || ''),
      price: Number(data.price) || 0,
      category: String(data.category || 'Mains'),
      image: String(data.image || ''),
      available: data.available !== false,
      featured: data.featured === true,
      tags: Array.isArray(data.tags) ? data.tags : []
    };
    menu.push(item);
    saveMenu(menu);
    return item;
  }

  function updateMenuItem(id, patch) {
    var numericId = Number(id);
    var menu = getMenu();
    var updated = null;
    var next = menu.map(function (f) {
      if (f.id !== numericId) return f;
      updated = Object.assign({}, f, patch, { id: numericId });
      return updated;
    });
    if (updated) saveMenu(next);
    return updated;
  }

  function deleteMenuItem(id) {
    var numericId = Number(id);
    var next = getMenu().filter(function (f) { return f.id !== numericId; });
    saveMenu(next);
    var cart = getCart().filter(function (l) { return l.foodId !== numericId; });
    saveCart(cart);
    return true;
  }

  function toggleAvailability(id) {
    var item = getFoodItem(id);
    if (!item) return null;
    return updateMenuItem(id, { available: !item.available });
  }

  function getCategories() {
    var seen = [];
    getMenu().forEach(function (f) {
      if (seen.indexOf(f.category) === -1) seen.push(f.category);
    });
    return seen.sort();
  }

  /* ---------- BOOKING IDS ---------- */
  function nextSequence() {
    var current = read(KEYS.SEQ, 1000);
    var n = typeof current === 'number' && isFinite(current) ? current : 1000;
    var next = n + 1;
    write(KEYS.SEQ, next);
    return next;
  }

  function generateBookingId() {
    return 'BK' + nextSequence();
  }

  /* ---------- BOOKINGS ---------- */
  function getBookings() {
    var list = read(KEYS.BOOKINGS, []);
    if (!Array.isArray(list)) return [];
    return list.filter(function (b) { return b && typeof b === 'object' && b.id; });
  }

  function saveBookings(list) {
    var ok = write(KEYS.BOOKINGS, Array.isArray(list) ? list : []);
    emit(EVENTS.BOOKINGS);
    return ok;
  }

  function getBooking(id) {
    return getBookings().filter(function (b) { return b.id === id; })[0] || null;
  }

  function createBooking(payload) {
    var items = (payload.items || []).map(function (i) {
      return {
        foodId: Number(i.foodId),
        name: String(i.name),
        quantity: Math.max(1, Number(i.quantity) || 1),
        price: Number(i.price) || 0
      };
    });

    if (!items.length) throw new Error('A booking needs at least one item.');

    var total = items.reduce(function (sum, i) {
      return sum + i.price * i.quantity;
    }, 0);

    var booking = {
      id: generateBookingId(),
      customerName: String(payload.customerName || '').trim(),
      phone: String(payload.phone || '').trim(),
      items: items,
      bookingDate: String(payload.bookingDate || ''),
      bookingTime: String(payload.bookingTime || ''),
      notes: String(payload.notes || ''),
      totalAmount: total,
      status: STATUS.PENDING,
      createdAt: new Date().toISOString()
    };

    var list = getBookings();
    list.push(booking);
    saveBookings(list);
    return booking;
  }

  function updateBooking(id, patch) {
    var list = getBookings();
    var updated = null;
    var next = list.map(function (b) {
      if (b.id !== id) return b;
      updated = Object.assign({}, b, patch, { id: b.id });
      return updated;
    });
    if (updated) saveBookings(next);
    return updated;
  }

  function updateBookingStatus(id, status) {
    return updateBooking(id, { status: status });
  }

  function canCancel(booking) {
    return !!booking && CANCELLABLE_STATUSES.indexOf(booking.status) !== -1;
  }

  function cancelBooking(id) {
    var booking = getBooking(id);
    if (!booking) return { ok: false, message: 'Booking not found.' };
    if (!canCancel(booking)) {
      return {
        ok: false,
        message: 'This booking is already ' + booking.status.toLowerCase() +
                 ' and can no longer be cancelled.'
      };
    }
    updateBookingStatus(id, STATUS.CANCELLED);
    return { ok: true, message: 'Booking ' + id + ' has been cancelled.' };
  }

  function deleteBooking(id) {
    saveBookings(getBookings().filter(function (b) { return b.id !== id; }));
    return true;
  }

  /* ---------- CART ---------- */
  function getCart() {
    var cart = read(KEYS.CART, []);
    if (!Array.isArray(cart)) return [];
    return cart
      .filter(function (l) { return l && isFinite(Number(l.foodId)); })
      .map(function (l) {
        return { foodId: Number(l.foodId), quantity: Math.max(1, Number(l.quantity) || 1) };
      });
  }

  function saveCart(cart) {
    var ok = write(KEYS.CART, Array.isArray(cart) ? cart : []);
    emit(EVENTS.CART);
    return ok;
  }

  function addToCart(foodId, quantity) {
    var numericId = Number(foodId);
    var qty = Math.max(1, Number(quantity) || 1);
    var cart = getCart();
    var line = cart.filter(function (l) { return l.foodId === numericId; })[0];
    if (line) line.quantity += qty;
    else cart.push({ foodId: numericId, quantity: qty });
    saveCart(cart);
    return cart;
  }

  function setCartQty(foodId, quantity) {
    var numericId = Number(foodId);
    var qty = Number(quantity);
    var cart = getCart();
    if (!isFinite(qty) || qty <= 0) {
      return removeFromCart(numericId);
    }
    cart = cart.map(function (l) {
      return l.foodId === numericId ? { foodId: numericId, quantity: Math.min(99, qty) } : l;
    });
    saveCart(cart);
    return cart;
  }

  function removeFromCart(foodId) {
    var numericId = Number(foodId);
    saveCart(getCart().filter(function (l) { return l.foodId !== numericId; }));
  }

  function clearCart() {
    saveCart([]);
  }

  function getCartLines() {
    var menu = getMenu();
    var index = {};
    menu.forEach(function (f) { index[f.id] = f; });

    return getCart().map(function (line) {
      var food = index[line.foodId];
      if (!food) return null;
      return {
        foodId: food.id,
        name: food.name,
        price: food.price,
        image: food.image,
        category: food.category,
        available: food.available !== false,
        quantity: line.quantity,
        lineTotal: food.price * line.quantity
      };
    }).filter(Boolean);
  }

  function getCartCount() {
    return getCart().reduce(function (sum, l) { return sum + l.quantity; }, 0);
  }

  function getCartTotal() {
    return getCartLines().reduce(function (sum, l) { return sum + l.lineTotal; }, 0);
  }

  /* ---------- SEEDING ---------- */
  function seedIfEmpty(payload) {
    var existingMenu = read(KEYS.MENU, null);
    if (!Array.isArray(existingMenu) || existingMenu.length === 0) {
      write(KEYS.MENU, payload.menu || []);
    }

    var existingBookings = read(KEYS.BOOKINGS, null);
    if (!Array.isArray(existingBookings)) {
      var demo = payload.bookings || [];
      write(KEYS.BOOKINGS, demo);
      var maxSeq = demo.reduce(function (max, b) {
        var n = parseInt(String(b.id).replace(/\D/g, ''), 10);
        return isFinite(n) ? Math.max(max, n) : max;
      }, 1000);
      write(KEYS.SEQ, Math.max(read(KEYS.SEQ, 1000), maxSeq));
    }

    write(KEYS.SEED, SEED_VERSION);
  }

  function resetAll() {
    Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    emit(EVENTS.MENU);
    emit(EVENTS.BOOKINGS);
    emit(EVENTS.CART);
  }

  /* ---------- PUBLIC API ---------- */
  global.FMStorage = {
    KEYS: KEYS,
    EVENTS: EVENTS,
    STATUS: STATUS,
    ACTIVE_STATUSES: ACTIVE_STATUSES,
    CANCELLABLE_STATUSES: CANCELLABLE_STATUSES,

    getMenu: getMenu,
    saveMenu: saveMenu,
    getFoodItem: getFoodItem,
    addMenuItem: addMenuItem,
    updateMenuItem: updateMenuItem,
    deleteMenuItem: deleteMenuItem,
    toggleAvailability: toggleAvailability,
    getCategories: getCategories,

    getBookings: getBookings,
    saveBookings: saveBookings,
    getBooking: getBooking,
    createBooking: createBooking,
    updateBooking: updateBooking,
    updateBookingStatus: updateBookingStatus,
    canCancel: canCancel,
    cancelBooking: cancelBooking,
    deleteBooking: deleteBooking,
    generateBookingId: generateBookingId,

    getCart: getCart,
    saveCart: saveCart,
    addToCart: addToCart,
    setCartQty: setCartQty,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    getCartLines: getCartLines,
    getCartCount: getCartCount,
    getCartTotal: getCartTotal,

    seedIfEmpty: seedIfEmpty,
    resetAll: resetAll
  };
})(window);