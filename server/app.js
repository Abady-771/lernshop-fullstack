import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = user => ({ id: user.id, name: user.name, email: user.email });
const bad = (res, message, status = 400) => res.status(status).json({ error: message });

export function createApp(secret, store) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  function auth(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return bad(res, 'Bitte zuerst anmelden.', 401);
    try { req.userId = jwt.verify(token, secret).sub; next(); }
    catch { return bad(res, 'Sitzung abgelaufen. Bitte erneut anmelden.', 401); }
  }

  async function presentCart(items) {
    const details = await Promise.all(items.map(async item => {
      const product = await store.findProductById(item.productId);
      return product && { product, quantity: item.quantity, lineTotalCents: product.priceCents * item.quantity };
    }));
    const available = details.filter(Boolean);
    return { items: available, totalCents: available.reduce((sum, item) => sum + item.lineTotalCents, 0) };
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/register', async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = req.body?.password;
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return bad(res, 'Name (2–80 Zeichen), E-Mail und Passwort (mindestens 8 Zeichen) prüfen.');
    }
    if (await store.findUserByEmail(email)) return bad(res, 'Diese E-Mail ist bereits registriert.', 409);
    try {
      const user = await store.createUser({ name, email, passwordHash: await bcrypt.hash(password, 12) });
      const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' });
      return res.status(201).json({ user: publicUser(user), token });
    } catch (error) {
      if (error.code === 11000) return bad(res, 'Diese E-Mail ist bereits registriert.', 409);
      throw error;
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = req.body?.password;
    if (typeof password !== 'string') return bad(res, 'Ungültige Zugangsdaten.', 401);
    const user = await store.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return bad(res, 'Ungültige Zugangsdaten.', 401);
    return res.json({ user: publicUser(user), token: jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' }) });
  });

  app.get('/api/me', auth, async (req, res) => {
    const user = await store.findUserById(req.userId);
    if (!user) return bad(res, 'Konto nicht gefunden.', 401);
    return res.json({ user: publicUser(user) });
  });

  app.get('/api/products', async (_req, res) => {
    const products = await store.listProducts();
    res.json({ products: products.sort((a, b) => a.title.localeCompare(b.title, 'de')) });
  });

  app.get('/api/products/:id', async (req, res) => {
    const product = await store.findProductById(req.params.id);
    if (!product) return bad(res, 'Produkt nicht gefunden.', 404);
    res.json({ product });
  });

  app.get('/api/cart', auth, async (req, res) => res.json(await presentCart(await store.getCart(req.userId))));

  app.put('/api/cart/items/:productId', auth, async (req, res) => {
    const quantity = req.body?.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return bad(res, 'Menge muss zwischen 1 und 99 liegen.');
    const product = await store.findProductById(req.params.productId);
    if (!product) return bad(res, 'Produkt nicht gefunden.', 404);
    if (quantity > product.stock) return bad(res, 'Nicht genügend Exemplare verfügbar.');
    const items = await store.getCart(req.userId);
    const item = items.find(entry => entry.productId === product.id);
    if (item) item.quantity = quantity;
    else items.push({ productId: product.id, quantity });
    await store.saveCart(req.userId, items);
    res.json(await presentCart(items));
  });

  app.delete('/api/cart/items/:productId', auth, async (req, res) => {
    const items = (await store.getCart(req.userId)).filter(item => item.productId !== req.params.productId);
    await store.saveCart(req.userId, items);
    res.json(await presentCart(items));
  });

  app.post('/api/orders', auth, async (req, res) => {
    const cart = await store.getCart(req.userId);
    if (cart.length === 0) return bad(res, 'Der Warenkorb ist leer.');
    const items = [];
    for (const entry of cart) {
      const product = await store.findProductById(entry.productId);
      if (!product || product.stock < entry.quantity) return bad(res, 'Ein Produkt ist nicht mehr in der gewünschten Menge verfügbar.');
      items.push({ productId: product.id, title: product.title, unitPriceCents: product.priceCents, quantity: entry.quantity });
    }
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const order = await store.createOrder(req.userId, items, totalCents);
    await store.saveCart(req.userId, []);
    res.status(201).json({ order: { id: order.id, totalCents, status: 'demo' } });
  });

  app.get('/api/orders', auth, async (req, res) => {
    const orders = await store.listOrders(req.userId);
    res.json({ orders: orders.map(order => ({ id: order.id, items: order.items.map(item => ({ title: item.title, quantity: item.quantity, unitPriceCents: item.unitPriceCents })), totalCents: order.totalCents, status: order.status, createdAt: order.createdAt })) });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Interner Fehler. Bitte erneut versuchen.' });
  });
  return app;
}
