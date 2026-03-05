const SHEET_NAME = 'Notas';

function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action === 'load') {
    return jsonResponse(loadData());
  }
  return jsonResponse({ ok: false, error: 'Acción GET no válida' });
}

function doPost(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action !== 'save') {
    return jsonResponse({ ok: false, error: 'Acción POST no válida' });
  }

  const studentId = Number(e.parameter.studentId);
  const weekIndex = Number(e.parameter.weekIndex); // 0..15
  const score = e.parameter.score;

  if (!studentId || weekIndex < 0 || weekIndex > 15) {
    return jsonResponse({ ok: false, error: 'Parámetros inválidos' });
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) return jsonResponse({ ok: false, error: `No existe hoja ${SHEET_NAME}` });

  const row = findRowById(sh, studentId);
  if (!row) {
    return jsonResponse({ ok: false, error: 'Estudiante no encontrado' });
  }

  const col = 3 + weekIndex; // C = S1
  sh.getRange(row, col).setValue(score === '' ? '' : Number(score));

  const scores = sh
    .getRange(row, 3, 1, 16)
    .getValues()[0]
    .filter((v) => v !== '' && !isNaN(v))
    .map(Number);

  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '';
  sh.getRange(row, 19).setValue(avg); // columna promedio

  return jsonResponse({ ok: true, promedio: avg });
}

function loadData() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) return { ok: false, error: `No existe hoja ${SHEET_NAME}` };

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, data: [] };

  const values = sh.getRange(2, 1, lastRow - 1, 19).getValues();
  const data = values.map((r) => ({
    id: r[0],
    nombre: r[1],
    scores: r.slice(2, 18).map((v) => (v === '' ? '' : String(v)))
  }));

  return { ok: true, data };
}

function findRowById(sh, studentId) {
  const totalRows = Math.max(0, sh.getLastRow() - 1);
  if (!totalRows) return null;

  const ids = sh.getRange(2, 1, totalRows, 1).getValues().flat();
  const idx = ids.findIndex((v) => Number(v) === studentId);
  return idx === -1 ? null : idx + 2;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
