const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'my-super-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const USERS_FILE = path.join(__dirname, 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// User registration
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const newUser = { name, email, password };
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  req.session.user = { name: user.name, email: user.email };
  req.session.cart = req.session.cart || [];
  res.json({ success: true, user: { name: user.name, email: user.email } });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// List products
app.get('/api/products', (req, res) => {
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
  }
  res.json(products);
});

// Cart operations (login required)
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  next();
}

// Get cart
app.get('/api/cart', requireLogin, (req, res) => {
  req.session.cart = req.session.cart || [];
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
  }
  // Show only existing products
  const cart = (req.session.cart || [])
    .map(item => {
      const product = products.find(p => p.id == item.productId);
      if (!product) return null;
      return {
        id: item.productId,
        name: product.name,
        price: product.price,
        qty: item.qty
      };
    })
    .filter(Boolean);
  res.json(cart);
});

// Add product to cart
app.post('/api/cart/add', requireLogin, (req, res) => {
  const { productId } = req.body;
  req.session.cart = req.session.cart || [];

  const item = req.session.cart.find(i => i.productId == productId);
  if (item) {
    item.qty += 1;
  } else {
    req.session.cart.push({ productId, qty: 1 });
  }
  res.json({ success: true });
});

// Increase/decrease item quantity in cart
app.post('/api/cart/update', requireLogin, (req, res) => {
  const { productId, change } = req.body;
  req.session.cart = req.session.cart || [];
  const item = req.session.cart.find(i => i.productId == productId);
  if (item) {
    item.qty += change;
    if (item.qty < 1) {
      req.session.cart = req.session.cart.filter(i => i.productId != productId);
    }
  }
  res.json({ success: true });
});

// Remove item from cart
app.post('/api/cart/remove', requireLogin, (req, res) => {
  const { productId } = req.body;
  req.session.cart = req.session.cart || [];
  req.session.cart = req.session.cart.filter(i => i.productId != productId);
  res.json({ success: true });
});

// Clear entire cart
app.post('/api/cart/clear', requireLogin, (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Nature Market server running on http://localhost:${PORT}`);
});