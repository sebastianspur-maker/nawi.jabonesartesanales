const SHEET_ID = process.env.CATALOG_SHEET_ID || '1kj8sO3T1H0Ik5tQ_idKJ0cROceASukUiToQVgNcYhTE';

const fallbackConfig = {
  nombre_marca: 'Nawi Jabones Artesanales',
  bajada: 'Jabones artesanales & cuidado personal',
  claim: 'Volver a lo esencial. Cuidarte, disfrutar y elegir de manera más consciente.',
  whatsapp: '+5491165302984',
  instagram: 'https://instagram.com/nawi.jabonesartesanales',
  email: 'nawijabonesartesanales@gmail.com',
  mensaje_header: '',
  mostrar_mensaje_header: 'No',
  mensaje_checkout: 'Nos comunicaremos por WhatsApp para coordinar el pago y la entrega.',
  moneda: 'ARS',
  dominio: 'nawijabonesartesanales.com.ar'
};

const demoProducts = [
  {
    ID: 'DEMO-JAB', Categoria: 'Jabones', Nombre: 'Jabón de muestra',
    Descripcion1: 'Producto de prueba para revisar el flujo', Descripcion2: 'Se reemplaza al cargar el Sheet',
    Precio: 7500, Stock: 20, Disponible: 'Sí', Foto1: '', Foto2: '', Foto3: '', demo: true
  },
  {
    ID: 'DEMO-CAB', Categoria: 'Cuidado del cabello', Nombre: 'Shampoo sólido de muestra',
    Descripcion1: 'Producto de prueba para revisar el flujo', Descripcion2: 'Se reemplaza al cargar el Sheet',
    Precio: 9800, Stock: 20, Disponible: 'Sí', Foto1: '', Foto2: '', Foto3: '', demo: true
  },
  {
    ID: 'DEMO-REG', Categoria: 'Para regalar', Nombre: 'Box Nawi de muestra',
    Descripcion1: 'Producto de prueba para revisar el flujo', Descripcion2: 'Se reemplaza al cargar el Sheet',
    Precio: 18500, Stock: 20, Disponible: 'Sí', Foto1: '', Foto2: '', Foto3: '', demo: true
  }
];

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

async function fetchTab(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'NawiCatalog/1.0' } });
  if (!response.ok) throw new Error(`Google Sheets ${response.status}`);
  const text = await response.text();
  if (/<!doctype html|<html/i.test(text)) throw new Error('Google Sheets requiere acceso público');
  return rowsToObjects(parseCsv(text));
}

function num(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeProduct(p) {
  return {
    id: String(p.ID || '').trim(),
    category: String(p.Categoria || '').trim(),
    name: String(p.Nombre || '').trim(),
    description1: String(p.Descripcion1 || '').trim(),
    description2: String(p.Descripcion2 || '').trim(),
    price: num(p.Precio) ?? 0,
    stock: num(p.Stock),
    available: String(p.Disponible || 'Sí').trim().toLowerCase() !== 'no',
    photos: [p.Foto1, p.Foto2, p.Foto3].map(v => String(v || '').trim()).filter(Boolean),
    demo: Boolean(p.demo)
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const [productRows, configRows] = await Promise.all([fetchTab('Productos'), fetchTab('Configuracion')]);
    const products = productRows
      .map(normalizeProduct)
      .filter(p => p.id && p.name && p.category && p.available);
    const config = { ...fallbackConfig };
    for (const row of configRows) {
      const key = String(row.Clave || '').trim();
      if (key) config[key] = String(row.Valor ?? '').trim();
    }
    if (!products.length) {
      return res.status(200).json({ source: 'demo', products: demoProducts.map(normalizeProduct), config, message: 'El Sheet todavía no tiene productos publicados. Se muestran productos de muestra.' });
    }
    return res.status(200).json({ source: 'sheet', products, config });
  } catch (error) {
    return res.status(200).json({ source: 'demo', products: demoProducts.map(normalizeProduct), config: fallbackConfig, message: 'El catálogo de Google Sheets aún no está disponible públicamente. Se muestran productos de muestra.', detail: String(error?.message || error) });
  }
}
