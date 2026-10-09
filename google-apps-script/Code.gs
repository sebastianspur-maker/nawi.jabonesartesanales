/**
 * Nawi Jabones Artesanales — API del Sheet privado "Nawi - Administración".
 *
 * GET  -> expone catálogo/configuración pública.
 * POST -> registra pedidos en Pedidos + DetallePedidos y envía emails.
 *
 * Script property requerida:
 * NAWI_SECRET = clave privada compartida con Vercel.
 */

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || 'catalog');
    if (action !== 'catalog') return json_({ ok: false, error: 'unknown_action' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var productSheet = ss.getSheetByName('Productos');
    var configSheet = ss.getSheetByName('Configuracion');

    if (!productSheet || !configSheet) {
      throw new Error('Faltan las pestañas Productos o Configuracion.');
    }

    var productRows = rowsToObjects_(productSheet.getDataRange().getValues());
    var products = productRows
      .filter(function(row) {
        return String(row.Nombre || '').trim() !== '';
      })
      .map(function(row, index) {
        return normalizeProduct_(row, index + 2);
      });

    var configRows = rowsToObjects_(configSheet.getDataRange().getValues());
    var config = {};
    configRows.forEach(function(row) {
      var key = String(row.Clave || '').trim();
      if (key) config[key] = String(row.Valor == null ? '' : row.Valor).trim();
    });

    return json_({ ok: true, products: products, config: config });
  } catch (err) {
    return json_({ ok: false, error: errorMessage_(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('NAWI_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var order = payload.order || {};
    validateOrder_(order);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var pedidos = ss.getSheetByName('Pedidos');
    var detalle = ss.getSheetByName('DetallePedidos');

    if (!pedidos || !detalle) {
      throw new Error('Faltan las pestañas Pedidos o DetallePedidos.');
    }

    // Idempotencia: no insertar ni notificar dos veces el mismo PedidoID.
    var lastRow = pedidos.getLastRow();
    if (lastRow >= 2) {
      var ids = pedidos.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (ids.indexOf(order.id) !== -1) {
        return json_({ ok: true, duplicate: true, id: order.id });
      }
    }

    var createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

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

    var detailRows = (order.items || []).map(function(item) {
      return [
        order.id,
        String(item.id || ''),
        String(item.category || ''),
        String(item.name || ''),
        Number(item.quantity) || 0,
        Number(item.unitPrice) || 0,
        Number(item.subtotal) || 0
      ];
    });

    if (detailRows.length) {
      detalle
        .getRange(detalle.getLastRow() + 1, 1, detailRows.length, detailRows[0].length)
        .setValues(detailRows);
    }

    SpreadsheetApp.flush();

    // Los emails forman parte de la confirmación del pedido.
    sendOrderEmails_(order, ss);

    return json_({
      ok: true,
      id: order.id,
      detailRows: detailRows.length,
      emailsSent: true
    });

  } catch (err) {
    return json_({
      ok: false,
      error: errorMessage_(err)
    });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function sendOrderEmails_(order, ss) {
  var config = readConfig_(ss);
  var businessEmail = String(config.email || 'nawijabonesartesanales@gmail.com').trim();
  var customerEmail = String(order.email || '').trim();
  var plain = orderEmailPlain_(order);
  var html = orderEmailHtml_(order);

  MailApp.sendEmail({
    to: businessEmail,
    subject: 'Nuevo pedido Nawi · ' + order.id,
    body: plain,
    htmlBody: html,
    name: 'Nawi Jabones Artesanales',
    replyTo: customerEmail
  });

  MailApp.sendEmail({
    to: customerEmail,
    subject: 'Confirmación de tu pedido Nawi · ' + order.id,
    body: plain,
    htmlBody: html,
    name: 'Nawi Jabones Artesanales',
    replyTo: businessEmail
  });
}

function readConfig_(ss) {
  var sheet = ss.getSheetByName('Configuracion');
  var config = {};

  if (!sheet) return config;

  rowsToObjects_(sheet.getDataRange().getValues()).forEach(function(row) {
    var key = String(row.Clave || '').trim();
    if (key) config[key] = String(row.Valor == null ? '' : row.Valor).trim();
  });

  return config;
}

function orderEmailPlain_(order) {
  var lines = [
    'Nawi Jabones Artesanales',
    '',
    'Pedido: ' + order.id,
    'Cliente: ' + order.name,
    'Email: ' + order.email,
    'WhatsApp: ' + order.whatsapp,
    '',
    'Productos:'
  ];

  (order.items || []).forEach(function(item) {
    lines.push(
      String(item.quantity) + ' × ' + String(item.name) +
      ' — $' + formatNumber_(item.subtotal)
    );
  });

  lines.push(
    '',
    'Total: $' + formatNumber_(order.total),
    '',
    'El pedido fue registrado correctamente. Nawi coordinará el pago y la entrega por WhatsApp.'
  );

  return lines.join('\n');
}

function orderEmailHtml_(order) {
  var rows = (order.items || []).map(function(item) {
    return '<tr>' +
      '<td style="padding:8px 0;border-bottom:1px solid #eee">' +
        escapeHtml_(String(item.quantity) + ' × ' + String(item.name)) +
      '</td>' +
      '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">' +
        '$' + formatNumber_(item.subtotal) +
      '</td>' +
    '</tr>';
  }).join('');

  return '<div style="font-family:Arial,sans-serif;color:#373a33;max-width:620px;margin:auto">' +
    '<h2 style="font-weight:500">Nawi Jabones Artesanales</h2>' +
    '<p><strong>Pedido:</strong> ' + escapeHtml_(order.id) + '</p>' +
    '<p><strong>Cliente:</strong> ' + escapeHtml_(order.name) + '<br>' +
    '<strong>Email:</strong> ' + escapeHtml_(order.email) + '<br>' +
    '<strong>WhatsApp:</strong> ' + escapeHtml_(order.whatsapp) + '</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:20px 0">' + rows + '</table>' +
    '<p style="font-size:20px"><strong>Total: $' + formatNumber_(order.total) + '</strong></p>' +
    '<p>El pedido fue registrado correctamente. Nawi coordinará el pago y la entrega por WhatsApp.</p>' +
  '</div>';
}

function formatNumber_(value) {
  return Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rowsToObjects_(values) {
  if (!values || !values.length) return [];

  var headers = values[0].map(function(value) {
    return String(value || '').trim();
  });

  return values.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      if (header) obj[header] = row[index];
    });
    return obj;
  });
}

function normalizeProduct_(row, rowNumber) {
  var rawCategory = String(row.Categoria || '').trim();
  var category = normalizeCategory_(rawCategory);
  var name = String(row.Nombre || '').trim();
  var explicitId = String(row.ID || '').trim();
  var id = explicitId || ('AUTO-' + slug_(category) + '-' + slug_(name));

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
      .map(function(value) { return String(value || '').trim(); })
      .filter(function(value) { return value !== ''; }),
    rowNumber: rowNumber
  };
}

function normalizeCategory_(value) {
  var folded = fold_(value);
  if (folded.indexOf('cabello') !== -1) return 'Cuidado del cabello';
  if (folded.indexOf('regal') !== -1 || folded.indexOf('box') !== -1) return 'Para regalar';
  if (folded.indexOf('jabon') !== -1) return 'Jabones';
  return value;
}

function normalizeYesNo_(value) {
  var folded = fold_(value);
  return !(folded === 'no' || folded === 'false' || folded === '0');
}

function number_(value) {
  if (typeof value === 'number') return value;

  var raw = String(value == null ? '' : value)
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  var n = Number(raw);
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

function errorMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
