import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { seedProducts } from './models.js';
import { createMemoryStore, createMongoStore } from './store.js';

const port = Number(process.env.PORT || 3001);
let store;
if (process.env.MONGODB_URI) {
  await mongoose.connect(process.env.MONGODB_URI);
  await seedProducts();
  store = createMongoStore();
} else {
  store = createMemoryStore();
}

const secret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const server = createApp(secret, store).listen(port, '127.0.0.1', () => {
  console.log(`Lernshop-API: http://127.0.0.1:${port}/api/health`);
  if (!process.env.MONGODB_URI) console.log('Lokaler Lernmodus: Daten werden beim Neustart zurückgesetzt.');
});

async function shutdown() {
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
