import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';

let server;
let base;

before(async () => {
  server = await new Promise(resolve => {
    const instance = createApp('integration-test-secret-with-enough-entropy', createMemoryStore()).listen(0, '127.0.0.1', () => resolve(instance));
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

async function api(pathname, method = 'GET', body, token) {
  const response = await fetch(base + pathname, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

test('registration, protected cart, demo checkout and order history', async () => {
  const products = await api('/products');
  assert.equal(products.status, 200);
  assert.equal(products.data.products.length, 6);
  assert.equal((await api('/cart')).status, 401);

  const invalid = await api('/auth/register', 'POST', { name: 'A', email: 'wrong', password: '123' });
  assert.equal(invalid.status, 400);
  const registration = await api('/auth/register', 'POST', { name: 'Test Person', email: 'TEST@example.org', password: 'long-password-123' });
  assert.equal(registration.status, 201);
  assert.equal(registration.data.user.email, 'test@example.org');
  assert.equal(registration.data.user.passwordHash, undefined);
  assert.equal((await api('/auth/register', 'POST', { name: 'Another', email: 'test@example.org', password: 'long-password-456' })).status, 409);
  assert.equal((await api('/auth/login', 'POST', { email: 'test@example.org', password: 'wrong' })).status, 401);
  assert.equal((await api('/auth/login', 'POST', { email: 'test@example.org', password: 'long-password-123' })).status, 200);

  const token = registration.data.token;
  const product = products.data.products[0];
  assert.equal((await api(`/cart/items/${product.id}`, 'PUT', { quantity: 0 }, token)).status, 400);
  assert.equal((await api(`/cart/items/${product.id}`, 'PUT', { quantity: 999 }, token)).status, 400);
  const cart = await api(`/cart/items/${product.id}`, 'PUT', { quantity: 2 }, token);
  assert.equal(cart.status, 200);
  assert.equal(cart.data.items[0].quantity, 2);
  assert.equal(cart.data.totalCents, product.priceCents * 2);

  const order = await api('/orders', 'POST', undefined, token);
  assert.equal(order.status, 201);
  assert.equal(order.data.order.totalCents, product.priceCents * 2);
  assert.equal(order.data.order.status, 'demo');
  assert.equal((await api('/cart', 'GET', undefined, token)).data.items.length, 0);
  assert.equal((await api('/orders', 'GET', undefined, token)).data.orders.length, 1);
  assert.equal((await api('/orders', 'POST', undefined, token)).status, 400);
});

test('health check and invalid login token', async () => {
  const health = await api('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.data, { status: 'ok' });

  const profile = await api('/me', 'GET', undefined, 'not-a-valid-token');
  assert.equal(profile.status, 401);
  assert.equal(profile.data.error, 'Sitzung abgelaufen. Bitte erneut anmelden.');
});

test('each user has a separate cart', async () => {
  const first = await api('/auth/register', 'POST', {
    name: 'Erste Person',
    email: 'first@example.org',
    password: 'long-password-123',
  });
  const second = await api('/auth/register', 'POST', {
    name: 'Zweite Person',
    email: 'second@example.org',
    password: 'long-password-456',
  });
  const products = await api('/products');
  const product = products.data.products[0];

  await api(`/cart/items/${product.id}`, 'PUT', { quantity: 1 }, first.data.token);
  const firstCart = await api('/cart', 'GET', undefined, first.data.token);
  const secondCart = await api('/cart', 'GET', undefined, second.data.token);

  assert.equal(firstCart.data.items.length, 1);
  assert.equal(secondCart.data.items.length, 0);
});
