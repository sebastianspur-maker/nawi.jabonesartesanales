/**
 * Nawi Jabones Artesanales — receptor de pedidos.
 * Este script debe quedar vinculado al Sheet privado "Nawi - Administración".
 *
 * Deploy:
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier persona
 */

const NAWI_SECRET = 'NAWI-SHEETS-4f9K2mQ7pL6x';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (payload.secret !== NAWI_SECRET) {
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

    // Idempotencia: no vuelve a insertar el mismo PedidoID.
    const lastRow = pedidos.getLastRow();
    if (lastRow >= 2) {
      const ids = pedidos.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (ids.includes(order.id)) {
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
