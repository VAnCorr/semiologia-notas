import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, FileSpreadsheet, Info } from 'lucide-react';

const DEFAULT_RUBRIC = [
  {
    id: 1,
    criterio: 'Entrevista con el paciente',
    peso: 25,
    descripcion: 'Realiza anamnesis dirigida, clara y ordenada.'
  },
  {
    id: 2,
    criterio: 'Ejecutó técnicas de examen físico',
    peso: 25,
    descripcion: 'Aplica correctamente inspección, palpación, percusión y auscultación.'
  },
  {
    id: 3,
    criterio: 'Razonamiento clínico',
    peso: 20,
    descripcion: 'Integra hallazgos y plantea diagnósticos diferenciales pertinentes.'
  },
  {
    id: 4,
    criterio: 'Hoja de historia clínica elaborada',
    peso: 20,
    descripcion: 'Documenta de forma completa, legible y estructurada.'
  },
  {
    id: 5,
    criterio: 'Asistencia en la semana',
    peso: 10,
    descripcion: 'Cumple asistencia y participación durante la semana.'
  }
];

const RUBRIC_STYLES = [
  {
    wrapper: 'bg-blue-50 border-blue-100',
    title: 'text-blue-900',
    description: 'text-blue-800'
  },
  {
    wrapper: 'bg-emerald-50 border-emerald-100',
    title: 'text-emerald-900',
    description: 'text-emerald-800'
  },
  {
    wrapper: 'bg-amber-50 border-amber-100',
    title: 'text-amber-900',
    description: 'text-amber-800'
  },
  {
    wrapper: 'bg-purple-50 border-purple-100',
    title: 'text-purple-900',
    description: 'text-purple-800'
  },
  {
    wrapper: 'bg-rose-50 border-rose-100',
    title: 'text-rose-900',
    description: 'text-rose-800'
  }
];

const initialStudents = [
  'Mario Francisco Gaitán Gutiérrez',
  'Yasary Fabiola Saavedra Guillén',
  'Kelly Daniella Vallejos Muñoz',
  'Raysa Indira Aguilar Solís',
  'José Antonio Aguilar Ulloa',
  'Alfonso José Alarcón Kuan',
  'Anthony Marcel Díaz Gutiérrez',
  'Nasim Arath Escobar Brizuela',
  'Ahtziri Rene Esquivel Córdoba'
];

const weeks = Array.from({ length: 16 }, (_, i) => `S${i + 1}`);

const getTodayDate = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const mergeStudents = (sheetData) => {
  return initialStudents.map((name, index) => {
    const id = index + 1;
    const fromSheet = sheetData.find((student) => Number(student.id) === id);
    return {
      id,
      nombre: name,
      scores: fromSheet?.scores?.length === 16 ? fromSheet.scores.map((s) => (s ?? '').toString()) : Array(16).fill('')
    };
  });
};

const createEmptyDailyRows = (students) => {
  return students.map((student) => ({
    id: student.id,
    nombre: student.nombre,
    rubricScores: Array(DEFAULT_RUBRIC.length).fill('')
  }));
};

const App = () => {
  const SCRIPT_URL = import.meta.env.VITE_GAS_URL || '';

  const [data, setData] = useState(() => {
    return initialStudents.map((name, index) => ({
      id: index + 1,
      nombre: name,
      scores: Array(16).fill('')
    }));
  });

  const [syncStatus, setSyncStatus] = useState('Sincronización local');
  const [evaluationDate, setEvaluationDate] = useState(getTodayDate());
  const [evaluationWeekIndex, setEvaluationWeekIndex] = useState(0);
  const [dailyRows, setDailyRows] = useState(() =>
    createEmptyDailyRows(initialStudents.map((name, index) => ({ id: index + 1, nombre: name })))
  );
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const saveTimersRef = useRef({});

  const calculateAverage = (scores) => {
    const numericScores = scores.filter((s) => s !== '' && !isNaN(parseFloat(s))).map(Number);
    if (numericScores.length === 0) return 0;
    const sum = numericScores.reduce((a, b) => a + b, 0);
    return (sum / numericScores.length).toFixed(1);
  };

  const calculateDailyTotal = (rubricScores) => {
    const weights = DEFAULT_RUBRIC.map((item) => Number(item.peso) || 0);
    const allFilled = rubricScores.every((s) => s !== '');
    if (!allFilled) return '';

    const numeric = rubricScores.map((s) => Number(s));
    if (numeric.some((n) => isNaN(n))) return '';

    const totalWeight = weights.reduce((acc, current) => acc + current, 0);
    if (totalWeight <= 0) return '';

    const weighted = numeric.reduce((acc, current, index) => acc + current * weights[index], 0) / totalWeight;
    return weighted.toFixed(1);
  };

  const loadFromSheets = async () => {
    if (!SCRIPT_URL) {
      setSyncStatus('Sin URL de Apps Script (VITE_GAS_URL)');
      return;
    }

    try {
      setSyncStatus('Cargando desde Google Sheets...');
      const gradesResponse = await fetch(`${SCRIPT_URL}?action=load`);
      const gradesResult = await gradesResponse.json();

      if (!gradesResult.ok || !Array.isArray(gradesResult.data)) {
        throw new Error(gradesResult.error || 'Respuesta inválida de notas');
      }

      const merged = mergeStudents(gradesResult.data);
      setData(merged);
      setDailyRows(createEmptyDailyRows(merged));
      setSyncStatus('Conectado con Google Sheets');
    } catch (error) {
      console.error(error);
      setSyncStatus('Error de carga. Trabajando en modo local');
      setDailyRows(createEmptyDailyRows(data));
    }
  };

  useEffect(() => {
    loadFromSheets();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
    };
  }, []);

  const persistScore = async (studentId, weekIndex, value) => {
    if (!SCRIPT_URL) return;

    const body = new URLSearchParams({
      action: 'save',
      studentId: String(studentId),
      weekIndex: String(weekIndex),
      score: value
    });

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Error guardando nota');
    }
  };

  const handleScoreChange = (studentId, weekIndex, value) => {
    if (value !== '' && (isNaN(value) || value < 0 || value > 100)) return;

    setData((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          const newScores = [...student.scores];
          newScores[weekIndex] = value;
          return { ...student, scores: newScores };
        }
        return student;
      })
    );

    if (!SCRIPT_URL) return;

    const key = `${studentId}-${weekIndex}`;
    if (saveTimersRef.current[key]) {
      clearTimeout(saveTimersRef.current[key]);
    }

    setSyncStatus('Sincronizando notas semanales...');
    saveTimersRef.current[key] = setTimeout(async () => {
      try {
        await persistScore(studentId, weekIndex, value);
        setSyncStatus('Notas semanales guardadas en Google Sheets');
      } catch (error) {
        console.error(error);
        setSyncStatus('Error al guardar notas semanales');
      }
    }, 450);
  };

  const handleDailyScoreChange = (studentId, criterionIndex, value) => {
    if (value !== '' && (isNaN(value) || Number(value) < 0 || Number(value) > 100)) return;

    setDailyRows((prev) =>
      prev.map((row) => {
        if (row.id !== studentId) return row;
        const nextScores = [...row.rubricScores];
        nextScores[criterionIndex] = value;
        return { ...row, rubricScores: nextScores };
      })
    );
  };

  const saveDailyEvaluation = async () => {
    if (!SCRIPT_URL) {
      setSyncStatus('No hay URL de Apps Script para guardar la rúbrica');
      return;
    }

    if (!evaluationDate) {
      setSyncStatus('Seleccione una fecha antes de guardar');
      return;
    }

    const hasIncomplete = dailyRows.some((row) => row.rubricScores.some((score) => score === ''));
    if (hasIncomplete) {
      setSyncStatus('Complete todos los puntajes de todos los estudiantes (0-100)');
      return;
    }

    const payload = dailyRows.map((row) => ({
      studentId: row.id,
      nombre: row.nombre,
      scores: row.rubricScores.map((score) => Number(score)),
      total: Number(calculateDailyTotal(row.rubricScores))
    }));

    if (payload.some((item) => isNaN(item.total))) {
      setSyncStatus('Verifique los puntajes antes de guardar');
      return;
    }

    setIsSavingDaily(true);
    setSyncStatus('Guardando evaluación diaria en Google Sheets...');

    try {
      const body = new URLSearchParams({
        action: 'save-evaluations',
        date: evaluationDate,
        weekIndex: String(evaluationWeekIndex),
        evaluations: JSON.stringify(payload)
      });

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'No se pudo guardar la evaluación');
      }

      if (Array.isArray(result.data)) {
        const merged = mergeStudents(result.data);
        setData(merged);
      }

      setDailyRows(createEmptyDailyRows(data));
      setSyncStatus(`Evaluación ${evaluationDate} guardada en ${weeks[evaluationWeekIndex]}`);
    } catch (error) {
      console.error(error);
      setSyncStatus('Error al guardar la evaluación diaria');
    } finally {
      setIsSavingDaily(false);
    }
  };

  const exportToCSV = () => {
    const header = ['No', 'Nombre del Estudiante', ...weeks, 'Promedio Final'];
    const rows = data.map((s) => [s.id, s.nombre, ...s.scores, calculateAverage(s.scores)]);

    const csvContent = [header, ...rows].map((e) => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Semiologia_Notas_Dr_Vanegas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
              <BookOpen className="text-blue-600" />
              Semiología Médica
            </h1>
            <p className="text-slate-500 font-medium">Dr. Denis Vanegas Corrales | Rúbrica Semanal de Evaluación</p>
            <p className="text-xs text-slate-500 mt-1">Estado: {syncStatus}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-semibold text-sm"
            >
              <FileSpreadsheet size={18} />
              Descargar respaldo CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Info size={20} />
              Rúbrica de evaluación (0-100)
            </h3>
            <div className="space-y-4">
              {DEFAULT_RUBRIC.map((criterion, index) => {
                const style = RUBRIC_STYLES[index % RUBRIC_STYLES.length];
                return (
                  <div key={criterion.id} className={`p-4 rounded-xl border ${style.wrapper}`}>
                    <p className={`font-bold ${style.title}`}>
                      {index + 1}. {criterion.criterio} ({criterion.peso}%)
                    </p>
                    <p className={`text-sm ${style.description}`}>{criterion.descripcion}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Evaluación diaria de estudiantes</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha de evaluación</label>
                <input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Semana</label>
                <select
                  value={evaluationWeekIndex}
                  onChange={(e) => setEvaluationWeekIndex(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  {weeks.map((week, index) => (
                    <option key={week} value={index}>
                      {week}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveDailyEvaluation}
                  disabled={isSavingDaily}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  {isSavingDaily ? 'Guardando...' : 'Guardar evaluación del día'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 border-r min-w-[220px]">Estudiante</th>
                    {DEFAULT_RUBRIC.map((criterion) => (
                      <th key={criterion.id} className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-r min-w-[90px]">
                        {criterion.criterio}
                      </th>
                    ))}
                    <th className="p-3 text-xs font-bold text-blue-700 uppercase tracking-wider text-center bg-blue-50">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map((row) => {
                    const total = calculateDailyTotal(row.rubricScores);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-sm font-semibold text-slate-700 sticky left-0 bg-white border-r">{row.nombre}</td>
                        {row.rubricScores.map((score, index) => (
                          <td key={`${row.id}-${index}`} className="p-1 border-r text-center">
                            <input
                              type="text"
                              value={score}
                              onChange={(e) => handleDailyScoreChange(row.id, index, e.target.value)}
                              className={`w-full h-9 text-center text-sm border-none focus:ring-2 focus:ring-blue-400 focus:outline-none rounded ${
                                score !== '' && Number(score) < 60 ? 'text-red-600 font-bold bg-red-50' : 'text-slate-700'
                              }`}
                              placeholder="0-100"
                            />
                          </td>
                        ))}
                        <td className="p-3 text-sm font-bold text-center bg-blue-50">
                          <span className={total !== '' && Number(total) < 60 ? 'text-red-600' : 'text-blue-700'}>{total || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 text-sm text-slate-600 mt-4">
              <li className="flex gap-2">
                <ChevronRight size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Cada guardado registra una evaluación diaria por estudiante en Google Sheets.</span>
              </li>
              <li className="flex gap-2">
                <ChevronRight size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>La hoja semanal (`S1...S16`) se actualiza automáticamente con el promedio acumulado de esa semana.</span>
              </li>
              <li className="flex gap-2">
                <ChevronRight size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Después de guardar, el formulario se reinicia para la siguiente jornada.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
