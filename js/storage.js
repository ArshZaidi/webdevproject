/* ============================================================
   storage.js — Shared localStorage abstraction layer
   Single source of truth for all persisted application data.
   BOTH modules (customer + admin) MUST use these functions.
   ============================================================ */

const STORAGE_KEYS = {
  MENU: 'fm_menu_items',
  BOOKINGS: 'fm_bookings',
  COUNTER: 'fm_booking_counter',
  SETTINGS: 'fm_settings'
};

/* ---------- Safe JSON helpers ---------- */

function safeParse(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn('[storage] Corrupted JSON detected, resetting to fallback.', err);
    return fallback;
  }
}

function emitChange(type, detail) {
  // Same-tab notification
  window.dispatchEvent(new CustomEvent('fm:datachange', { detail: { type, ...detail } }));
}

/* ---------- Custom events for same-tab reactivity ---------- */

function notifyBookingsChanged() {
  emitChange('bookings');
  try {
    window.localStorage.setItem('fm_last_update', Date.now().toString());
  } catch (_) { /* ignore */ }
}

/* ---------- MENU ---------- */

function getMenuItems() {
  const items = safeParse(localStorage.getItem(STORAGE_KEYS.MENU), null);
  if (!Array.isArray(items)) {
    // Seed from data.js if available
    const seed = (window.FOOD_SEED && Array.isArray(window.FOOD_SEED)) ? window.FOOD_SEED : [];
    if (seed.length) {
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(seed));
      return seed.slice();
    }
    return [];
  }
  return items;
}

function saveMenuItems(items) {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
  emitChange('menu');
}

function getMenuItemById(id) {
  return getMenuItems().find(item => Number(item.id) === Number(id)) || null;
}

function addMenuItem(item) {
  const items = getMenuItems();
  const maxId = items.reduce((m, i) => Math.max(m, Number(i.id) || 0), 0);
  const newItem = {
    id: maxId + 1,
    name: String(item.name || '').trim(),
    category: String(item.category || 'Mains').trim(),
    price: Number(item.price) || 0,
    description: String(item.description || '').trim(),
    image: String(item.image || '').trim(),
    available: item.available !== false,
    featured: item.featured === true,
    createdAt: new Date().toISOString()
  };
  items.push(newItem);
  saveMenuItems(items);
  return newItem;
}

function updateMenuItem(id, patch) {
  const items = getMenuItems();
  const idx = items.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, id: items[idx].id };
  saveMenuItems(items);
  return items[idx];
}

function deleteMenuItem(id) {
  const items = getMenuItems().filter(i => Number(i.id) !== Number(id));
  saveMenuItems(items);
  return true;
}

function toggleMenuItemAvailability(id) {
  const item = getMenuItemById(id);
  if (!item) return null;
  return updateMenuItem(id, { available: !item.available });
}

/* ---------- BOOKINGS ---------- */

function getBookings() {
  const bookings = safeParse(localStorage.getItem(STORAGE_KEYS.BOOKINGS), []);
  return Array.isArray(bookings) ? bookings : [];
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  notifyBookingsChanged();
  emitChange('bookings');
}

function generateBookingId() {
  let counter = Number(localStorage.getItem(STORAGE_KEYS.COUNTER)) || 1000;
  counter += 1;
  localStorage.setItem(STORAGE_KEYS.COUNTER, String(counter));
  return 'BK' + counter;
}

function addBooking(booking) {
  const bookings = getBookings();
  const record = {
    id: booking.id || generateBookingId(),
    customerName: String(booking.customerName || '').trim(),
    contactNumber: String(booking.contactNumber || '').trim(),
    items: Array.isArray(booking.items) ? booking.items : [],
    bookingDate: booking.bookingDate || '',
    bookingTime: booking.bookingTime || '',
    totalAmount: Number(booking.totalAmount) || 0,
    status: booking.status || 'Pending',
    notes: booking.notes || '',
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  bookings.push(record);
  saveBookings(bookings);
  return record;
}

function updateBookingStatus(id, status) {
  const allowed = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Rejected'];
  if (!allowed.includes(status)) return null;
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return null;
  bookings[idx].status = status;
  bookings[idx].updatedAt = new Date().toISOString();
  saveBookings(bookings);
  return bookings[idx];
}

function deleteBooking(id) {
  const bookings = getBookings().filter(b => b.id !== id);
  saveBookings(bookings);
  return true;
}

/* ---------- Cross-tab sync ---------- */

window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key === STORAGE_KEYS.BOOKINGS) emitChange('bookings');
  if (e.key === STORAGE_KEYS.MENU) emitChange('menu');
});

/* ---------- Public API ---------- */

window.Storage = {
  KEYS: STORAGE_KEYS,
  getMenuItems,
  saveMenuItems,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getBookings,
  saveBookings,
  generateBookingId,
  addBooking,
  updateBookingStatus,
  deleteBooking
};