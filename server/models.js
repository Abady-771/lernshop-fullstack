import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const productSchema = new Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  priceCents: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  color: { type: String, required: true },
  emoji: { type: String, required: true },
}, { timestamps: true });

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, min: 1, max: 99, required: true },
  }],
}, { timestamps: true });

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    unitPriceCents: { type: Number, required: true },
    quantity: { type: Number, required: true },
  }],
  totalCents: { type: Number, required: true },
  status: { type: String, enum: ['demo'], default: 'demo' },
}, { timestamps: true });

export const User = model('User', userSchema);
export const Product = model('Product', productSchema);
export const Cart = model('Cart', cartSchema);
export const Order = model('Order', orderSchema);

export const sampleProducts = [
    { title: 'Nordlicht Tischlampe', category: 'Wohnen', description: 'Eine warme Leuchte für den Schreibtisch oder das Wohnzimmer.', priceCents: 3490, stock: 12, color: '#f3ddae', emoji: '💡' },
    { title: 'Küstenbecher', category: 'Küche', description: 'Keramikbecher für den ruhigen Start in den Tag.', priceCents: 1590, stock: 18, color: '#c7dcdb', emoji: '☕' },
    { title: 'Notizbuch Fjord', category: 'Büro', description: 'Punktierte Seiten für Skizzen, Ideen und Notizen.', priceCents: 1290, stock: 21, color: '#d7d4bf', emoji: '📓' },
    { title: 'Wolldecke Sand', category: 'Wohnen', description: 'Weiche Decke für gemütliche Abende.', priceCents: 5990, stock: 9, color: '#e5d6c3', emoji: '🧶' },
    { title: 'Trinkflasche Strand', category: 'Unterwegs', description: 'Wiederverwendbare Flasche für jeden Tag.', priceCents: 2490, stock: 14, color: '#b7d7df', emoji: '💧' },
    { title: 'Pflanzentopf Salbei', category: 'Wohnen', description: 'Schlichter Topf für kleine Zimmerpflanzen.', priceCents: 1990, stock: 16, color: '#cbd8bb', emoji: '🪴' },
];

export async function seedProducts() {
  if (await Product.countDocuments()) return;
  await Product.insertMany(sampleProducts);
}
