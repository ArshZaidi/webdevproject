/* ============================================================
   data.js — Seed food data + shared constants
   ============================================================ */

window.FOOD_CATEGORIES = ['Starters', 'Mains', 'Bowls', 'Desserts', 'Drinks'];

window.FOOD_SEED = [
  {
    id: 1,
    name: 'Truffle Mushroom Risotto',
    category: 'Mains',
    price: 480,
    description: 'Carnaroli rice slow-cooked with wild mushrooms, finished with black truffle and aged parmesan.',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: true
  },
  {
    id: 2,
    name: 'Herb Roasted Chicken',
    category: 'Mains',
    price: 420,
    description: 'Free-range chicken, rosemary jus, seasonal root vegetables, olive oil crushed potatoes.',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: true
  },
  {
    id: 3,
    name: 'Saffron Seafood Paella',
    category: 'Mains',
    price: 620,
    description: 'Bomba rice, tiger prawns, mussels, saffron, sweet peppers and a hint of smoked paprika.',
    image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  },
  {
    id: 4,
    name: 'Burrata & Heirloom Tomato',
    category: 'Starters',
    price: 320,
    description: 'Creamy burrata, heritage tomatoes, basil oil, aged balsamic and toasted sourdough.',
    image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: true
  },
  {
    id: 5,
    name: 'Smoked Salmon Tartare',
    category: 'Starters',
    price: 360,
    description: 'Hand-cut salmon, capers, dill crème fraîche, lemon zest and crisp rye.',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  },
  {
    id: 6,
    name: 'Garden Buddha Bowl',
    category: 'Bowls',
    price: 340,
    description: 'Quinoa, roasted sweet potato, avocado, edamame, pickled red cabbage, tahini dressing.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  },
  {
    id: 7,
    name: 'Miso Glazed Salmon Bowl',
    category: 'Bowls',
    price: 520,
    description: 'Miso-glazed salmon, sticky rice, cucumber ribbons, sesame and yuzu mayonnaise.',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: true
  },
  {
    id: 8,
    name: 'Dark Chocolate Fondant',
    category: 'Desserts',
    price: 260,
    description: '70% dark chocolate fondant, salted caramel centre, vanilla bean ice cream.',
    image: 'https://images.unsplash.com/photo-1541599468348-e96984315921?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: true
  },
  {
    id: 9,
    name: 'Lemon & Thyme Tart',
    category: 'Desserts',
    price: 220,
    description: 'Zesty lemon curd, thyme-infused pastry, torched Italian meringue.',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  },
  {
    id: 10,
    name: 'Cold-Pressed Green Juice',
    category: 'Drinks',
    price: 180,
    description: 'Kale, cucumber, green apple, ginger and lime. Refreshing and vibrant.',
    image: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  },
  {
    id: 11,
    name: 'Masala Chai',
    category: 'Drinks',
    price: 120,
    description: 'Slow-brewed Assam tea with cardamom, cinnamon, ginger and steamed milk.',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1200&q=80',
    available: false,
    featured: false
  },
  {
    id: 12,
    name: 'Charred Corn Ribs',
    category: 'Starters',
    price: 280,
    description: 'Smoky corn ribs, chipotle butter, lime and crumbled feta.',
    image: 'https://images.unsplash.com/photo-1541599468348-e96984315921?auto=format&fit=crop&w=1200&q=80',
    available: true,
    featured: false
  }
];

window.BOOKING_STATUSES = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Rejected'];

window.STATUS_META = {
  Pending:   { label: 'Pending',   color: '#b48a2c', bg: 'rgba(180,138,44,0.12)' },
  Accepted:  { label: 'Accepted',  color: '#2f6a4a', bg: 'rgba(47,106,74,0.12)' },
  Preparing: { label: 'Preparing', color: '#8a5a2b', bg: 'rgba(138,90,43,0.12)' },
  Ready:     { label: 'Ready',     color: '#2e5a88', bg: 'rgba(46,90,136,0.12)' },
  Completed: { label: 'Completed', color: '#1d3d2a', bg: 'rgba(29,61,42,0.12)' },
  Cancelled: { label: 'Cancelled', color: '#8b3a3a', bg: 'rgba(139,58,58,0.12)' },
  Rejected:  { label: 'Rejected',  color: '#8b3a3a', bg: 'rgba(139,58,58,0.12)' }
};

window.TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];