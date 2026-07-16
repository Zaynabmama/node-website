var express = require('express');
var fs = require('fs');
var path = require('path');
var emailService = require('../lib/emailService');
var router = express.Router();

var dataDir = path.join(__dirname, '..', 'data');
var usersFile = path.join(dataDir, 'users.json');
var productsFile = path.join(dataDir, 'products.json');
var ordersFile = path.join(dataDir, 'orders.json');

var categories = [
  { title: 'Makeup', text: 'Bold color, refined finish, and everyday essentials.' },
  { title: 'Skincare', text: 'Gentle hydration for a glow that feels healthy.' },
  { title: 'Fragrance', text: 'Fresh, floral, and confident signature scents.' }
];

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([
      { id: 1, name: 'Admin User', email: 'admin@luna.com', password: 'admin123', role: 'admin' }
    ], null, 2));
  }

  if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, JSON.stringify([
      { id: 1, name: 'Velvet Satin Lip', brand: 'Luna', price: '$24', badge: 'Bestseller', emoji: '💄', description: 'A soft matte finish with lasting comfort.', stock: 12, soldOut: false, images: [], modelImage: '', reviews: [] },
      { id: 2, name: 'Glow Serum', brand: 'Aura', price: '$39', badge: 'New', emoji: '✨', description: 'A dewy serum that brightens and hydrates.', stock: 8, soldOut: false, images: [], modelImage: '', reviews: [] },
      { id: 3, name: 'Lash Lift Mascara', brand: 'Nova', price: '$22', badge: 'Top Rated', emoji: '👁️', description: 'Builds length and drama without clumping.', stock: 15, soldOut: false, images: [], modelImage: '', reviews: [] },
      { id: 4, name: 'Dawn Blush', brand: 'Luna', price: '$28', badge: 'Trending', emoji: '🌸', description: 'A rosy flush for a healthy glow.', stock: 10, soldOut: false, images: [], modelImage: '', reviews: [] },
      { id: 5, name: 'Hydra Cream', brand: 'Aura', price: '$34', badge: 'Editor Pick', emoji: '🫧', description: 'A rich cream that locks in hydration.', stock: 6, soldOut: false, images: [], modelImage: '', reviews: [] },
      { id: 6, name: 'Velvet Eau De Parfum', brand: 'Nova', price: '$46', badge: 'Limited', emoji: '🌼', description: 'A soft floral scent designed for everyday elegance.', stock: 5, soldOut: false, images: [], modelImage: '', reviews: [] }
    ], null, 2));
  }

  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
  }
}

ensureDataFiles();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getCurrentUser(req) {
  var sessionId = req.cookies.lunaSession;
  if (!sessionId) {
    return null;
  }

  var users = readJson(usersFile);
  return users.find(function(user) {
    return user.id.toString() === sessionId.toString();
  }) || null;
}

function getProducts() {
  return readJson(productsFile);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function filterProducts(searchTerm) {
  var products = getProducts();
  if (!searchTerm) {
    return products;
  }

  var term = searchTerm.toLowerCase();
  return products.filter(function(product) {
    return product.name.toLowerCase().includes(term) || product.brand.toLowerCase().includes(term) || product.description.toLowerCase().includes(term);
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('index', { page: 'Home', menuId: 'home', products: getProducts(), categories: categories, user: user });
});

router.get('/shop', function(req, res, next) {
  var searchTerm = req.query.search || '';
  var user = getCurrentUser(req);
  res.render('shop', { page: 'Shop', menuId: 'shop', products: filterProducts(searchTerm), categories: categories, searchTerm: searchTerm, user: user });
});

router.get('/auth', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('auth', { page: 'Account', menuId: 'auth', user: user });
});

router.get('/profile', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('profile', { page: 'Profile', menuId: 'profile', user: user });
});

router.get('/admin', function(req, res, next) {
  var user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.redirect('/auth');
  }

  res.render('admin', { page: 'Admin', menuId: 'admin', products: getProducts(), user: user });
});

router.get('/about', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('about', { page: 'About Us', menuId: 'about', user: user });
});

router.get('/checkout', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('checkout', { page: 'Checkout', menuId: 'checkout', user: user });
});

router.get('/contact', function(req, res, next) {
  var user = getCurrentUser(req);
  res.render('contact', { page: 'Contact Us', menuId: 'contact', user: user });
});

router.get('/api/auth/me', function(req, res) {
  res.json({ user: getCurrentUser(req) });
});

router.post('/api/auth/signup', function(req, res) {
  var users = readJson(usersFile);
  var payload = req.body || {};
  var existing = users.find(function(user) {
    return user.email.toLowerCase() === (payload.email || '').toLowerCase();
  });
  var otp = generateOtp();

  if (existing) {
    existing.otp = otp;
    existing.otpVerified = false;
    writeJson(usersFile, users);
    emailService.sendEmail('otp', existing.email, { firstName: existing.name, otp: otp });
    return res.json({ ok: true, requiresOtp: true, email: existing.email });
  }

  var newUser = {
    id: Date.now(),
    name: payload.name || 'Customer',
    email: payload.email,
    password: payload.password,
    role: payload.role || 'client',
    phone: '',
    address: '',
    otp: otp,
    otpVerified: false
  };

  users.push(newUser);
  writeJson(usersFile, users);
  emailService.sendEmail('otp', newUser.email, { firstName: newUser.name, otp: otp });
  res.json({ ok: true, requiresOtp: true, email: newUser.email });
});

router.post('/api/auth/verify-otp', function(req, res) {
  var users = readJson(usersFile);
  var payload = req.body || {};
  var match = users.find(function(user) {
    return user.email.toLowerCase() === (payload.email || '').toLowerCase();
  });

  if (!match) {
    return res.status(404).json({ ok: false, message: 'No account found for that email.' });
  }

  if (String(match.otp) !== String(payload.otp || '')) {
    return res.status(401).json({ ok: false, message: 'Invalid OTP.' });
  }

  match.otpVerified = true;
  match.otp = '';
  writeJson(usersFile, users);
  emailService.sendEmail('otp', match.email, { firstName: match.name, otp: payload.otp });
  res.cookie('lunaSession', match.id, { httpOnly: true });
  res.json({ ok: true, user: match });
});

router.post('/api/auth/signin', function(req, res) {
  var users = readJson(usersFile);
  var payload = req.body || {};
  var match = users.find(function(user) {
    return user.email.toLowerCase() === (payload.email || '').toLowerCase() && user.password === (payload.password || '');
  });

  if (!match) {
    return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
  }

  if (!match.otpVerified) {
    var otp = generateOtp();
    match.otp = otp;
    writeJson(usersFile, users);
    emailService.sendEmail('otp', match.email, { firstName: match.name, otp: otp });
    return res.json({ ok: true, requiresOtp: true, otp: otp, email: match.email });
  }

  res.cookie('lunaSession', match.id, { httpOnly: true });
  res.json({ ok: true, user: match });
});

router.post('/api/auth/signout', function(req, res) {
  res.clearCookie('lunaSession');
  res.json({ ok: true });
});

router.post('/api/profile/update', function(req, res) {
  var user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'You must be signed in.' });
  }

  var users = readJson(usersFile);
  var current = users.find(function(item) {
    return item.id === user.id;
  });

  if (!current) {
    return res.status(404).json({ ok: false, message: 'User not found.' });
  }

  current.name = req.body.name || current.name;
  current.email = req.body.email || current.email;
  current.phone = req.body.phone || current.phone;
  current.address = req.body.address || current.address;
  writeJson(usersFile, users);
  res.json({ ok: true, user: current });
});

router.get('/api/products', function(req, res) {
  res.json(getProducts());
});

router.get('/api/reviews', function(req, res) {
  var user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required.' });
  }

  var products = getProducts();
  var reviews = [];
  products.forEach(function(product) {
    (product.reviews || []).forEach(function(review) {
      reviews.push({
        productId: product.id,
        productName: product.name,
        rating: review.rating,
        comment: review.comment,
        userName: review.userName,
        createdAt: review.createdAt
      });
    });
  });

  res.json({ ok: true, reviews: reviews });
});

router.get('/api/orders', function(req, res) {
  var user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Please sign in to view your orders.' });
  }

  var orders = readJson(ordersFile);
  if (user.role === 'admin') {
    return res.json({ ok: true, orders: orders });
  }

  var userOrders = orders.filter(function(order) {
    return order.userId === user.id;
  });

  res.json({ ok: true, orders: userOrders });
});

router.post('/api/products/update', function(req, res) {
  var user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required.' });
  }

  var products = getProducts();
  var payload = req.body || {};
  var product = products.find(function(item) {
    return item.id === payload.id;
  });

  if (!product) {
    return res.status(404).json({ ok: false, message: 'Product not found.' });
  }

  product.stock = Number(payload.stock || 0);
  product.price = payload.price || product.price;
  product.soldOut = payload.soldOut === true || product.stock <= 0;
  product.stock = product.soldOut ? 0 : product.stock;
  writeJson(productsFile, products);
  res.json({ ok: true, product: product });
});

router.post('/api/products/add', function(req, res) {
  var user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required.' });
  }

  var payload = req.body || {};
  if (!payload.name || !payload.brand || !payload.price || !payload.description) {
    return res.status(400).json({ ok: false, message: 'Missing required product fields.' });
  }

  var products = getProducts();
  var nextId = products.reduce(function(maxId, item) {
    return Math.max(maxId, item.id || 0);
  }, 0) + 1;

  var newProduct = {
    id: nextId,
    name: payload.name,
    brand: payload.brand,
    price: payload.price,
    badge: payload.badge || '',
    emoji: payload.emoji || '',
    description: payload.description,
    stock: Number(payload.stock || 0),
    soldOut: payload.soldOut === true || Number(payload.stock || 0) <= 0,
    images: [payload.image1 || '', payload.image2 || '', payload.image3 || ''].filter(Boolean),
    modelImage: payload.modelImage || '',
    reviews: []
  };

  products.push(newProduct);
  writeJson(productsFile, products);
  res.json({ ok: true, product: newProduct });
});

router.get('/product/:id', function(req, res, next) {
  var user = getCurrentUser(req);
  var productId = Number(req.params.id);
  var product = getProducts().find(function(item) {
    return item.id === productId;
  });

  if (!product) {
    return res.status(404).render('error', { page: 'Not found', message: 'Product not found.', user: user });
  }

  res.render('product', { page: product.name, menuId: 'shop', product: product, user: user });
});

router.post('/api/products/:id/reviews', function(req, res) {
  var user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Please sign in to submit a review.' });
  }

  var products = getProducts();
  var productId = Number(req.params.id);
  var product = products.find(function(item) {
    return item.id === productId;
  });

  if (!product) {
    return res.status(404).json({ ok: false, message: 'Product not found.' });
  }

  var payload = req.body || {};
  var rating = Math.min(5, Math.max(1, Number(payload.rating) || 5));
  var review = {
    id: Date.now(),
    userId: user.id,
    userName: user.name || 'Guest',
    rating: rating,
    comment: (payload.comment || '').trim(),
    createdAt: new Date().toISOString()
  };

  product.reviews = product.reviews || [];
  product.reviews.push(review);
  writeJson(productsFile, products);

  var users = readJson(usersFile);
  var admin = users.find(function(account) {
    return account.role === 'admin';
  });

  if (admin && admin.email) {
    emailService.sendEmail('review_notification', admin.email, {
      adminName: admin.name,
      reviewerName: review.userName,
      productName: product.name,
      rating: review.rating,
      comment: review.comment
    }).catch(function(err) {
      console.error('Review notification failed:', err);
    });
  }

  res.json({ ok: true, review: review, product: product });
});

router.post('/api/orders', function(req, res) {
  var items = req.body.items || [];
  var products = getProducts();
  var orders = readJson(ordersFile);
  var orderItems = [];
  var total = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var product = products.find(function(entry) {
      return entry.name === item.name;
    });

    if (!product) {
      return res.status(400).json({ ok: false, message: 'One of the items is unavailable.' });
    }

    if (product.soldOut || product.stock <= 0 || product.stock < (item.quantity || 1)) {
      return res.status(400).json({ ok: false, message: product.name + ' is out of stock.' });
    }

    product.stock = product.stock - (item.quantity || 1);
    product.soldOut = product.stock <= 0;
    total += parseFloat(product.price.replace('$', '')) * (item.quantity || 1);
    orderItems.push({ name: product.name, quantity: item.quantity || 1, price: product.price });
  }

  writeJson(productsFile, products);
  var orderId = Date.now();
  var user = getCurrentUser(req);
  var paymentMethod = req.body.paymentMethod === 'delivery' ? 'delivery' : 'online';
  var orderRecord = {
    id: orderId,
    userId: user ? user.id : null,
    userEmail: user ? user.email : null,
    status: 'confirmed',
    items: orderItems,
    total: total,
    paymentMethod: paymentMethod,
    createdAt: new Date().toISOString()
  };

  orders.push(orderRecord);
  writeJson(ordersFile, orders);

  if (user) {
    emailService.sendEmail('order_confirmation', user.email, { firstName: user.name, orderNumber: orderId, total: total.toFixed(2) }).catch(console.error);
    emailService.sendEmail('follow_up', user.email, { firstName: user.name }).catch(console.error);
  }

  res.json({ ok: true, total: total, orderItems: orderItems, orderId: orderId });
});

router.post('/api/orders/:orderId/cancel', function(req, res) {
  var user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Please sign in to cancel orders.' });
  }

  var orders = readJson(ordersFile);
  var orderId = Number(req.params.orderId);
  var order = orders.find(function(entry) {
    return entry.id === orderId;
  });

  if (!order) {
    return res.status(404).json({ ok: false, message: 'Order not found.' });
  }

  if (order.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'You are not authorized to cancel this order.' });
  }

  if (order.status === 'cancelled') {
    return res.status(400).json({ ok: false, message: 'This order has already been cancelled.' });
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();

  var products = getProducts();
  order.items.forEach(function(item) {
    var product = products.find(function(entry) {
      return entry.name === item.name;
    });

    if (product) {
      product.stock = (product.stock || 0) + (item.quantity || 1);
      product.soldOut = product.stock <= 0;
    }
  });

  writeJson(productsFile, products);
  writeJson(ordersFile, orders);

  emailService.sendEmail('order_cancellation', user.email, { firstName: user.name, orderNumber: orderId, total: order.total.toFixed(2) }).catch(console.error);
  res.json({ ok: true, order: order });
});

module.exports = router;
