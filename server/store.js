import { randomBytes } from 'node:crypto';
import { Cart, Order, Product, User, sampleProducts } from './models.js';

const id = value => String(value._id ?? value.id);
const productView = product => ({ id: id(product), title: product.title, category: product.category, description: product.description, priceCents: product.priceCents, stock: product.stock, color: product.color, emoji: product.emoji });
const userView = user => user && ({ id: id(user), name: user.name, email: user.email, passwordHash: user.passwordHash });

export function createMemoryStore() {
  const users = new Map();
  const products = sampleProducts.map((product, index) => ({ ...product, id: (index + 1).toString(16).padStart(24, '0') }));
  const carts = new Map();
  const orders = [];
  return {
    async findUserByEmail(email) { return [...users.values()].find(user => user.email === email) || null; },
    async findUserById(userId) { return users.get(userId) || null; },
    async createUser({ name, email, passwordHash }) {
      if ([...users.values()].some(user => user.email === email)) { const error = new Error('Duplicate email'); error.code = 11000; throw error; }
      const user = { id: randomBytes(12).toString('hex'), name, email, passwordHash };
      users.set(user.id, user); return user;
    },
    async listProducts() { return products.map(product => ({ ...product })); },
    async findProductById(productId) { return products.find(product => product.id === productId) || null; },
    async getCart(userId) { return (carts.get(userId) || []).map(item => ({ ...item })); },
    async saveCart(userId, items) { carts.set(userId, items.map(item => ({ ...item }))); },
    async createOrder(userId, items, totalCents) {
      const order = { id: randomBytes(12).toString('hex'), items: items.map(item => ({ ...item })), totalCents, status: 'demo', createdAt: new Date() };
      orders.push({ ...order, userId }); return order;
    },
    async listOrders(userId) { return orders.filter(order => order.userId === userId).sort((a, b) => b.createdAt - a.createdAt); },
  };
}

export function createMongoStore() {
  return {
    async findUserByEmail(email) { return userView(await User.findOne({ email }).lean()); },
    async findUserById(userId) { return userView(await User.findById(userId).lean()); },
    async createUser(input) { return userView(await User.create(input)); },
    async listProducts() { return (await Product.find().lean()).map(productView); },
    async findProductById(productId) {
      if (!/^[a-f0-9]{24}$/i.test(productId)) return null;
      const product = await Product.findById(productId).lean();
      return product ? productView(product) : null;
    },
    async getCart(userId) {
      const cart = await Cart.findOne({ user: userId }).lean();
      return (cart?.items || []).map(item => ({ productId: String(item.product), quantity: item.quantity }));
    },
    async saveCart(userId, items) {
      await Cart.findOneAndUpdate({ user: userId }, { $set: { items: items.map(item => ({ product: item.productId, quantity: item.quantity })) } }, { upsert: true, new: true });
    },
    async createOrder(userId, items, totalCents) {
      const order = await Order.create({ user: userId, items: items.map(item => ({ product: item.productId, title: item.title, quantity: item.quantity, unitPriceCents: item.unitPriceCents })), totalCents, status: 'demo' });
      return { id: String(order._id), totalCents, status: order.status };
    },
    async listOrders(userId) {
      const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
      return orders.map(order => ({ id: String(order._id), items: order.items.map(item => ({ title: item.title, quantity: item.quantity, unitPriceCents: item.unitPriceCents })), totalCents: order.totalCents, status: order.status, createdAt: order.createdAt }));
    },
  };
}
