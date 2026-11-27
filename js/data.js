/* =========================================================================
   data.js — SHARED SEED DATA
   Owners: Arsh + Kanish
   ========================================================================= */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateFromNow(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  var MENU = [
    {
      id: 1,
      name: 'Charred Heirloom Salad',
      description: 'Blistered heritage tomatoes, whipped ricotta, basil oil and toasted pine nuts.',
      price: 320,
      category: 'Starters',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Vegetarian']
    },
    {
      id: 2,
      name: 'Saffron Tomato Soup',
      description: 'Slow-roasted tomatoes, saffron threads, finished with a swirl of cultured cream.',
      price: 280,
      category: 'Starters',
      image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Vegetarian']
    },
    {
      id: 3,
      name: 'Wild Mushroom Risotto',
      description: 'Carnaroli rice, forest mushrooms, aged parmesan and a whisper of truffle.',
      price: 520,
      category: 'Mains',
      image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: true,
      tags: ["Chef's pick", 'Vegetarian']
    },
    {
      id: 4,
      name: 'Olive & Herb Roast Chicken',
      description: 'Half chicken marinated in olive, thyme and lemon. Served with pan jus.',
      price: 640,
      category: 'Mains',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Signature']
    },
    {
      id: 5,
      name: 'Pepper Crust Steak',
      description: 'Dry-aged sirloin, cracked peppercorn crust, bone marrow butter and watercress.',
      price: 780,
      category: 'Mains',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Signature']
    },
    {
      id: 6,
      name: 'Miso Glazed Salmon',
      description: 'Line-caught salmon, white miso glaze, sesame greens and pickled ginger.',
      price: 720,
      category: 'Mains',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: true,
      tags: ["Chef's pick"]
    },
    {
      id: 7,
      name: 'Garden Grain Bowl',
      description: 'Farro, roasted squash, avocado, pomegranate and a lemon-tahini dressing.',
      price: 380,
      category: 'Bowls',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: true,
      tags: ['Vegan', 'Gluten-free']
    },
    {
      id: 8,
      name: 'Avocado Sourdough',
      description: 'Wood-fired sourdough, smashed avocado, chilli flakes and soft poached egg.',
      price: 290,
      category: 'Bowls',
      image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Vegetarian']
    },
    {
      id: 9,
      name: 'Salted Caramel Tart',
      description: 'Dark chocolate ganache, burnt caramel and a sea-salt shortcrust shell.',
      price: 240,
      category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: true,
      tags: ['Sweet']
    },
    {
      id: 10,
      name: 'Buttermilk Pancake Stack',
      description: 'Three fluffy pancakes, maple butter, wild berries and toasted almonds.',
      price: 260,
      category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Vegetarian']
    },
    {
      id: 11,
      name: 'Single Origin Pour Over',
      description: 'Ethiopian beans, hand-poured. Notes of bergamot, jasmine and stone fruit.',
      price: 180,
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
      available: true,
      featured: false,
      tags: ['Vegan']
    },
    {
      id: 12,
      name: 'Cardamom Rose Latte',
      description: 'Double espresso, steamed milk, green cardamom and a rose petal finish.',
      price: 210,
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80',
      available: false,
      featured: false,
      tags: ['Vegetarian']
    }
  ];

  var now = new Date().toISOString();
  var DEMO_BOOKINGS = [
    {
      id: 'BK1001',
      customerName: 'Aarti Menon',
      phone: '9876543210',
      items: [
        { foodId: 3, name: 'Wild Mushroom Risotto', quantity: 2, price: 520 },
        { foodId: 11, name: 'Single Origin Pour Over', quantity: 1, price: 180 }
      ],
      bookingDate: dateFromNow(1),
      bookingTime: '13:00',
      notes: 'One guest is vegetarian — please confirm no meat stock.',
      totalAmount: 1220,
      status: 'Accepted',
      createdAt: now
    },
    {
      id: 'BK1002',
      customerName: 'Rohan Iyer',
      phone: '9812345678',
      items: [
        { foodId: 6, name: 'Miso Glazed Salmon', quantity: 1, price: 720 }
      ],
      bookingDate: dateFromNow(2),
      bookingTime: '19:00',
      notes: '',
      totalAmount: 720,
      status: 'Pending',
      createdAt: now
    },
    {
      id: 'BK1003',
      customerName: 'Meera Kapoor',
      phone: '9900112233',
      items: [
        { foodId: 7, name: 'Garden Grain Bowl', quantity: 2, price: 380 },
        { foodId: 9, name: 'Salted Caramel Tart', quantity: 3, price: 240 }
      ],
      bookingDate: dateFromNow(3),
      bookingTime: '12:00',
      notes: 'Birthday — a candle would be lovely.',
      totalAmount: 1480,
      status: 'Preparing',
      createdAt: now
    }
  ];

  window.FM_SEED = { menu: MENU, bookings: DEMO_BOOKINGS };

  if (window.FMStorage && window.FMStorage.seedIfEmpty) {
    window.FMStorage.seedIfEmpty(window.FM_SEED);
  }
})();