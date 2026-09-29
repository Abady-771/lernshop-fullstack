import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
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
const app = createApp(secret, store);
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Lernshop läuft auf Port ${port}.`);
  if (!process.env.MONGODB_URI) console.log('Lokaler Lernmodus: Daten werden beim Neustart zurückgesetzt.');
});

async function shutdown() {
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
