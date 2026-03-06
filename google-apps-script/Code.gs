const SHEET_NAME = 'Notas';
const RUBRIC_SHEET_NAME = 'Rubrica';
const EVAL_SHEET_NAME = 'Evaluaciones';

function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action === 'load') {
    return jsonResponse(loadData());
  }
  if (action === 'load-rubric' || action === 'load_rubric') {
    return jsonResponse(loadRubric());
  }
  return jsonResponse({ ok: false, error: 'Acción GET no válida' });
}

function doPost(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action === 'save-evaluations' || action === 'save_evaluations') {
    return jsonResponse(saveEvaluations(e));
  }

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

function saveEvaluations(e) {
  const dateValue = String(e.parameter.date || '').trim();
  const weekIndex = Number(e.parameter.weekIndex);
  const rawEvaluations = e.parameter.evaluations || '[]';

  if (!dateValue || weekIndex < 0 || weekIndex > 15) {
    return { ok: false, error: 'Fecha o semana inválida' };
  }

  let evaluations;
  try {
    evaluations = JSON.parse(rawEvaluations);
  } catch (err) {
    return { ok: false, error: 'Formato de evaluaciones inválido' };
  }

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return { ok: false, error: 'No hay evaluaciones para guardar' };
  }

  const notesSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!notesSheet) return { ok: false, error: `No existe hoja ${SHEET_NAME}` };

  const evalSheet = ensureEvaluationsSheet();
  const now = new Date();

  const rows = evaluations.map((item) => {
    const studentId = Number(item.studentId);
    const studentName = String(item.nombre || '');
    const total = Number(item.total);
    const scores = Array.isArray(item.scores) ? item.scores : [];

    return [
      now,
      dateValue,
      weekIndex + 1,
      studentId,
      studentName,
      isNaN(total) ? '' : total,
      JSON.stringify(scores)
    ];
  });

  evalSheet.getRange(evalSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);

  updateWeeklyScoresFromEvaluations(notesSheet, evalSheet, weekIndex);

  const loaded = loadData();
  return {
    ok: true,
    saved: rows.length,
    data: loaded.ok ? loaded.data : []
  };
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

function loadRubric() {
  const sh = SpreadsheetApp.getActive().getSheetByName(RUBRIC_SHEET_NAME);
  if (!sh) {
    return {
      ok: false,
      error: `No existe hoja ${RUBRIC_SHEET_NAME}`
    };
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, data: [] };

  const values = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  const data = values
    .filter((row) => row[0] !== '' && row[1] !== '')
    .map((row, idx) => ({
      id: idx + 1,
      criterio: String(row[0]),
      peso: Number(row[1]),
      descripcion: row[2] === '' ? '' : String(row[2])
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

function ensureEvaluationsSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(EVAL_SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(EVAL_SHEET_NAME);
  }

  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp', 'fecha', 'semana', 'student_id', 'nombre', 'puntaje_total', 'detalle_scores']);
  }

  return sh;
}

function updateWeeklyScoresFromEvaluations(notesSheet, evalSheet, weekIndex) {
  const evalLastRow = evalSheet.getLastRow();
  if (evalLastRow < 2) return;

  const targetWeek = weekIndex + 1;
  const evalValues = evalSheet.getRange(2, 1, evalLastRow - 1, 7).getValues();
  const byStudent = {};

  evalValues.forEach((row) => {
    const week = Number(row[2]);
    const studentId = Number(row[3]);
    const total = Number(row[5]);

    if (week !== targetWeek || !studentId || isNaN(total)) return;

    if (!byStudent[studentId]) byStudent[studentId] = [];
    byStudent[studentId].push(total);
  });

  const notesLastRow = notesSheet.getLastRow();
  if (notesLastRow < 2) return;

  const ids = notesSheet.getRange(2, 1, notesLastRow - 1, 1).getValues().flat();

  ids.forEach((idValue, idx) => {
    const studentId = Number(idValue);
    const row = idx + 2;

    if (!studentId || !byStudent[studentId] || byStudent[studentId].length === 0) return;

    const scores = byStudent[studentId];
    const avgWeek = scores.reduce((a, b) => a + b, 0) / scores.length;

    notesSheet.getRange(row, 3 + weekIndex).setValue(avgWeek.toFixed(1));
    recomputeStudentFinalAverage(notesSheet, row);
  });
}

function recomputeStudentFinalAverage(notesSheet, row) {
  const scores = notesSheet
    .getRange(row, 3, 1, 16)
    .getValues()[0]
    .filter((v) => v !== '' && !isNaN(v))
    .map(Number);

  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '';
  notesSheet.getRange(row, 19).setValue(avg);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
