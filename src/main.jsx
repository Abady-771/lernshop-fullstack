import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, AppBar, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Container, CssBaseline, Divider, Grid, IconButton, MenuItem, Paper, Select, Snackbar, Stack, TextField, ThemeProvider, Toolbar, Typography, createTheme } from '@mui/material';
import './styles.css';

const theme = createTheme({
  palette: { primary: { main: '#205f60' }, secondary: { main: '#b66a44' }, background: { default: '#f7f7f2', paper: '#fffefb' }, text: { primary: '#213334' } },
  typography: { fontFamily: '"Segoe UI", Arial, sans-serif', h1: { fontWeight: 800 }, h2: { fontWeight: 800 }, h4: { fontWeight: 750 }, button: { fontWeight: 700, textTransform: 'none' } },
  shape: { borderRadius: 14 },
});

const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const AuthContext = createContext(null);

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Die Anfrage ist fehlgeschlagen.');
  return data;
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('lernshop-token'));
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!token) { setUser(null); return; }
    request('/me', { token }).then(data => setUser(data.user)).catch(() => {
      localStorage.removeItem('lernshop-token'); setToken(null); setUser(null);
    });
  }, [token]);
  function saveSession(data) { localStorage.setItem('lernshop-token', data.token); setToken(data.token); setUser(data.user); }
  function logout() { localStorage.removeItem('lernshop-token'); setToken(null); setUser(null); }
  const value = useMemo(() => ({ token, user, saveSession, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

function Shell({ children }) {
  const { user, logout } = useAuth();
  return <>
    <AppBar position="static" elevation={0} sx={{ background: '#fffefb', color: 'text.primary', borderBottom: '1px solid #e6e8df' }}>
      <Container maxWidth="lg"><Toolbar disableGutters sx={{ gap: 2, minHeight: 72 }}>
        <Typography component={RouterLink} to="/" className="brand" sx={{ fontSize: 23, fontWeight: 850, flexGrow: 1, color: 'primary.main', textDecoration: 'none' }}>◒ Lernshop<span className="brand-dot">.</span></Typography>
        <Button component={RouterLink} to="/" color="inherit">Produkte</Button>
        {user && <Button component={RouterLink} to="/orders" color="inherit" className="desktop-link">Bestellungen</Button>}
        <Button component={RouterLink} to="/cart" color="inherit">🛒 Warenkorb</Button>
        {user ? <Button onClick={logout} variant="outlined" size="small">Abmelden</Button> : <Button component={RouterLink} to="/login" variant="contained" size="small">Anmelden</Button>}
      </Toolbar></Container>
    </AppBar>
    <Box component="main" sx={{ minHeight: 'calc(100vh - 170px)' }}>{children}</Box>
    <Box component="footer" sx={{ borderTop: '1px solid #e4e8df', py: 4, mt: 8 }}><Container maxWidth="lg"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Typography variant="body2">© Lernshop · Programmier-Übungsprojekt</Typography><Typography variant="body2" color="text.secondary">Demo-Checkout · keine echte Zahlung oder Lieferung</Typography></Stack></Container></Box>
  </>;
}

function Catalog() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('Alle');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { request('/products').then(data => setProducts(data.products)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const categories = ['Alle', ...new Set(products.map(product => product.category))];
  const visible = products.filter(product =>
    (category === 'Alle' || product.category === category) &&
    product.title.toLowerCase().includes(search.trim().toLowerCase())
  );
  async function add(product) {
    if (!token) return navigate('/login');
    try {
      const cart = await request('/cart', { token });
      const previous = cart.items.find(item => item.product.id === product.id)?.quantity || 0;
      await request(`/cart/items/${product.id}`, { token, method: 'PUT', body: JSON.stringify({ quantity: previous + 1 }) });
      setNotice(`${product.title} ist im Warenkorb.`);
    } catch (e) { setError(e.message); }
  }
  return <>
    <Box className="hero"><Container maxWidth="lg"><Box className="hero-content"><Chip label="Ein Projekt zum Lernen" size="small" sx={{ bgcolor: '#deece8', color: '#205f60', fontWeight: 700, mb: 3 }} /><Typography variant="h1" sx={{ fontSize: { xs: 40, md: 64 }, lineHeight: 1.08, mb: 2 }}>Kleine Dinge.<br /><span className="hero-accent">Große Freude.</span></Typography><Typography variant="h6" sx={{ maxWidth: 510, color: '#536465', fontWeight: 400, mb: 3 }}>Ein Demoshop für schöne Alltagsgegenstände – von der Produktliste bis zur Testbestellung selbst ausprobieren.</Typography><Button href="#produkte" variant="contained" size="large">Produkte entdecken</Button></Box><Box className="hero-art" aria-hidden="true"><span>☕</span><span>🪴</span><span>💡</span></Box></Container></Box>
    <Container maxWidth="lg" id="produkte" sx={{ pt: 7 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'end' }} spacing={2} sx={{ mb: 3 }}><Box><Typography variant="overline" color="primary">ENTDECKEN</Typography><Typography variant="h4">Unsere Auswahl</Typography></Box><Typography color="text.secondary">{visible.length} Produkte</Typography></Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}>{categories.map(item => <Chip key={item} label={item} clickable onClick={() => setCategory(item)} color={category === item ? 'primary' : 'default'} variant={category === item ? 'filled' : 'outlined'} />)}</Stack>
      <TextField
        label="Produkt suchen"
        size="small"
        value={search}
        onChange={event => setSearch(event.target.value)}
        sx={{ mb: 3, width: { xs: '100%', sm: 320 } }}
      />
      {loading ? <CircularProgress /> : <Grid container spacing={3}>{visible.map(product => <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}><Card className="product-card" elevation={0}><Box className="product-visual" sx={{ backgroundColor: product.color }}><span aria-hidden="true">{product.emoji}</span></Box><CardContent sx={{ flexGrow: 1 }}><Typography variant="overline" color="primary">{product.category}</Typography><Typography variant="h6" sx={{ fontWeight: 750 }}>{product.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ minHeight: 42, mt: 1 }}>{product.description}</Typography></CardContent><CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{euros(product.priceCents)}</Typography><Button onClick={() => add(product)} variant="contained" disabled={!product.stock}>Hinzufügen</Button></CardActions></Card></Grid>)}</Grid>}
    </Container>
    <Snackbar open={Boolean(notice || error)} autoHideDuration={4500} onClose={() => { setNotice(''); setError(''); }}><Alert severity={error ? 'error' : 'success'} onClose={() => { setNotice(''); setError(''); }}>{error || notice}</Alert></Snackbar>
  </>;
}

function AuthPage({ register = false }) {
  const { saveSession, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { saveSession(await request(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(form) })); navigate('/'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Container maxWidth="sm" sx={{ mt: 8 }}><Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, border: '1px solid #e4e8df' }}><Typography variant="overline" color="primary">DEIN KONTO</Typography><Typography variant="h4" sx={{ mb: 1 }}>{register ? 'Konto erstellen' : 'Willkommen zurück'}</Typography><Typography color="text.secondary" sx={{ mb: 4 }}>Für Warenkorb und Testbestellungen brauchst du ein Konto.</Typography><Box component="form" onSubmit={submit}><Stack spacing={2}>{register && <TextField label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} inputProps={{ minLength: 2, maxLength: 80 }} />}<TextField label="E-Mail" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><TextField label="Passwort" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} inputProps={{ minLength: register ? 8 : undefined }} />{error && <Alert severity="error">{error}</Alert>}<Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Bitte warten…' : register ? 'Registrieren' : 'Anmelden'}</Button><Button component={RouterLink} to={register ? '/login' : '/register'}>{register ? 'Schon registriert? Anmelden' : 'Noch kein Konto? Registrieren'}</Button></Stack></Box></Paper></Container>;
}

function Private({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function CartPage() {
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { request('/cart', { token }).then(setCart).catch(e => setError(e.message)); }, [token]);
  async function update(id, quantity) {
    setError('');
    try { setCart(await request(`/cart/items/${id}`, { token, method: quantity ? 'PUT' : 'DELETE', ...(quantity ? { body: JSON.stringify({ quantity }) } : {}) })); }
    catch (e) { setError(e.message); }
  }
  async function checkout() {
    setBusy(true); setError('');
    try { await request('/orders', { token, method: 'POST' }); navigate('/orders', { state: { notice: 'Deine Testbestellung wurde erstellt.' } }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Container maxWidth="md" sx={{ mt: 7 }}><Typography variant="overline" color="primary">DEINE AUSWAHL</Typography><Typography variant="h4" sx={{ mb: 3 }}>Warenkorb</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{!cart ? <CircularProgress /> : cart.items.length === 0 ? <Paper elevation={0} sx={{ p: 5, textAlign: 'center' }}><Typography variant="h6">Noch nichts im Warenkorb.</Typography><Button component={RouterLink} to="/" sx={{ mt: 2 }}>Produkte ansehen</Button></Paper> : <Stack spacing={2}>{cart.items.map(({ product, quantity, lineTotalCents }) => <Paper key={product.id} elevation={0} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', border: '1px solid #e4e8df', flexWrap: 'wrap' }}><Box className="cart-thumb" sx={{ bgcolor: product.color }}>{product.emoji}</Box><Box sx={{ flexGrow: 1, minWidth: 170 }}><Typography fontWeight={750}>{product.title}</Typography><Typography variant="body2" color="text.secondary">{euros(product.priceCents)} pro Stück</Typography></Box><Select size="small" value={quantity} onChange={e => update(product.id, Number(e.target.value))} aria-label={`Menge für ${product.title}`}>{Array.from({ length: Math.min(product.stock, 10) }, (_, i) => <MenuItem key={i} value={i + 1}>{i + 1}</MenuItem>)}</Select><Typography sx={{ minWidth: 85, textAlign: 'right' }} fontWeight={750}>{euros(lineTotalCents)}</Typography><IconButton onClick={() => update(product.id, 0)} aria-label={`${product.title} entfernen`}>×</IconButton></Paper>)}<Paper elevation={0} sx={{ p: 3, mt: 2 }}><Stack direction="row" justifyContent="space-between"><Typography variant="h6">Gesamt</Typography><Typography variant="h6" fontWeight={800}>{euros(cart.totalCents)}</Typography></Stack><Divider sx={{ my: 2 }} /><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Dies ist ein Test-Checkout. Es wird nichts bezahlt oder verschickt.</Typography><Button variant="contained" size="large" fullWidth disabled={busy} onClick={checkout}>Testbestellung erstellen</Button></Paper></Stack>}</Container>;
}

function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { request('/orders', { token }).then(data => setOrders(data.orders)).catch(e => setError(e.message)); }, [token]);
  return <Container maxWidth="md" sx={{ mt: 7 }}><Typography variant="overline" color="primary">DEIN KONTO</Typography><Typography variant="h4" sx={{ mb: 3 }}>Testbestellungen</Typography>{error && <Alert severity="error">{error}</Alert>}{!orders ? <CircularProgress /> : orders.length === 0 ? <Paper elevation={0} sx={{ p: 5 }}><Typography>Du hast noch keine Testbestellung erstellt.</Typography><Button component={RouterLink} to="/" sx={{ mt: 2 }}>Zum Shop</Button></Paper> : <Stack spacing={2}>{orders.map(order => <Paper key={order.id} elevation={0} sx={{ p: 3, border: '1px solid #e4e8df' }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Box><Typography fontWeight={750}>Bestellung #{order.id.slice(-6).toUpperCase()}</Typography><Typography variant="body2" color="text.secondary">{new Date(order.createdAt).toLocaleString('de-DE')}</Typography></Box><Chip size="small" label="Demo" color="primary" variant="outlined" /></Stack>{order.items.map((item, index) => <Stack direction="row" justifyContent="space-between" key={index}><Typography variant="body2">{item.quantity} × {item.title}</Typography><Typography variant="body2">{euros(item.unitPriceCents * item.quantity)}</Typography></Stack>)}<Divider sx={{ my: 2 }} /><Typography textAlign="right" fontWeight={800}>Gesamt: {euros(order.totalCents)}</Typography></Paper>)}</Stack>}</Container>;
}

function App() {
  return <BrowserRouter><AuthProvider><Shell><Routes><Route path="/" element={<Catalog />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} /><Route path="/cart" element={<Private><CartPage /></Private>} /><Route path="/orders" element={<Private><OrdersPage /></Private>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell></AuthProvider></BrowserRouter>;
}

createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>);
