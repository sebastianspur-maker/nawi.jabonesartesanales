/**
 * Nawi Jabones Artesanales — API del Sheet privado "Nawi - Administración".
 *
 * GET  -> expone SOLO catálogo/configuración pública.
 * POST -> registra pedidos en Pedidos + DetallePedidos.
 *
 * Antes de publicar:
 * Project Settings -> Script properties
 * NAWI_SECRET = la clave privada compartida con Vercel.
 */

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'catalog');
    if (action !== 'catalog') return json_({ ok: false, error: 'unknown_action' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const productSheet = ss.getSheetByName('Productos');
    const configSheet = ss.getSheetByName('Configuracion');

    if (!productSheet || !configSheet) {
      throw new Error('Faltan las pestañas Productos o Configuracion.');
    }

    const productValues = productSheet.getDataRange().getValues();
    const productRows = rowsToObjects_(productValues);
    const products = productRows
      .filter(row => String(row.Nombre || '').trim() !== '')
      .map((row, index) => normalizeProduct_(row, index + 2));

    const configValues = configSheet.getDataRange().getValues();
    const configRows = rowsToObjects_(configValues);
    const config = {};
    configRows.forEach(row => {
      const key = String(row.Clave || '').trim();
      if (key) config[key] = String(row.Valor == null ? '' : row.Valor).trim();
    });

    return json_({ ok: true, products: products, config: config });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('NAWI_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    const order = payload.order || {};
    validateOrder_(order);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pedidos = ss.getSheetByName('Pedidos');
    const detalle = ss.getSheetByName('DetallePedidos');

    if (!pedidos || !detalle) {
      throw new Error('Faltan las pestañas Pedidos o DetallePedidos.');
    }

    // Idempotencia: nunca duplica un PedidoID ya registrado.
    const lastRow = pedidos.getLastRow();
    if (lastRow >= 2) {
      const ids = pedidos.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (ids.indexOf(order.id) !== -1) {
        return json_({ ok: true, duplicate: true, id: order.id });
      }
    }

    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

    pedidos.appendRow([
      order.id,
      createdAt,
      order.name,
      order.email,
      order.whatsapp,
      Number(order.total) || 0,
      'Nuevo',
      'No',
      ''
    ]);

    const detailRows = (order.items || []).map(item => [
      order.id,
      String(item.id || ''),
      String(item.category || ''),
      String(item.name || ''),
      Number(item.quantity) || 0,
      Number(item.unitPrice) || 0,
      Number(item.subtotal) || 0
    ]);

    if (detailRows.length) {
      detalle
        .getRange(detalle.getLastRow() + 1, 1, detailRows.length, detailRows[0].length)
        .setValues(detailRows);
    }

    SpreadsheetApp.flush();

    return json_({
      ok: true,
      id: order.id,
      detailRows: detailRows.length
    });

  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function rowsToObjects_(values) {
  if (!values || !values.length) return [];
  const headers = values[0].map(value => String(value || '').trim());
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = row[index];
    });
    return obj;
  });
}

function normalizeProduct_(row, rowNumber) {
  const rawCategory = String(row.Categoria || '').trim();
  const category = normalizeCategory_(rawCategory);
  const name = String(row.Nombre || '').trim();
  const explicitId = String(row.ID || '').trim();
  const id = explicitId || ('AUTO-' + slug_(category) + '-' + slug_(name));

  return {
    id: id,
    category: category,
    sourceCategory: rawCategory,
    name: name,
    description1: String(row.Descripcion1 || '').trim(),
    description2: String(row.Descripcion2 || '').trim(),
    price: number_(row.Precio),
    stock: number_(row.Stock),
    available: normalizeYesNo_(row.Disponible),
    photos: [row.Foto1, row.Foto2, row.Foto3]
      .map(value => String(value || '').trim())
      .filter(value => value !== ''),
    rowNumber: rowNumber
  };
}

function normalizeCategory_(value) {
  const folded = fold_(value);
  if (folded.indexOf('cabello') !== -1) return 'Cuidado del cabello';
  if (folded.indexOf('regal') !== -1 || folded.indexOf('box') !== -1) return 'Para regalar';
  if (folded.indexOf('jabon') !== -1) return 'Jabones';
  return value;
}

function normalizeYesNo_(value) {
  const folded = fold_(value);
  return !(folded === 'no' || folded === 'false' || folded === '0');
}

function number_(value) {
  if (typeof value === 'number') return value;
  const raw = String(value == null ? '' : value)
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(raw);
  return isFinite(n) ? n : 0;
}

function fold_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u');
}

function slug_(value) {
  return fold_(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function validateOrder_(order) {
  if (!order || !order.id) throw new Error('PedidoID faltante.');
  if (!order.name) throw new Error('Nombre faltante.');
  if (!order.email) throw new Error('Email faltante.');
  if (!order.whatsapp) throw new Error('WhatsApp faltante.');
  if (!Array.isArray(order.items) || !order.items.length) {
    throw new Error('El pedido no contiene productos.');
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
