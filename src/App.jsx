import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, FileSpreadsheet, Info } from 'lucide-react';

const App = () => {
  const SCRIPT_URL = import.meta.env.VITE_GAS_URL || '';

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

  const [data, setData] = useState(() => {
    return initialStudents.map((name, index) => ({
      id: index + 1,
      nombre: name,
      scores: Array(16).fill('')
    }));
  });

  const [activeTab, setActiveTab] = useState('grades');
  const [syncStatus, setSyncStatus] = useState('Sincronización local');
  const saveTimersRef = useRef({});

  const calculateAverage = (scores) => {
    const numericScores = scores.filter((s) => s !== '' && !isNaN(parseFloat(s))).map(Number);
    if (numericScores.length === 0) return 0;
    const sum = numericScores.reduce((a, b) => a + b, 0);
    return (sum / numericScores.length).toFixed(1);
  };

  const loadFromSheets = async () => {
    if (!SCRIPT_URL) {
      setSyncStatus('Sin URL de Apps Script (VITE_GAS_URL)');
      return;
    }

    try {
      setSyncStatus('Cargando desde Google Sheets...');
      const response = await fetch(`${SCRIPT_URL}?action=load`);
      const result = await response.json();

      if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Respuesta inválida');
      }

      const merged = initialStudents.map((name, index) => {
        const id = index + 1;
        const fromSheet = result.data.find((student) => Number(student.id) === id);
        return {
          id,
          nombre: name,
          scores: fromSheet?.scores?.length === 16 ? fromSheet.scores.map((s) => (s ?? '').toString()) : Array(16).fill('')
        };
      });

      setData(merged);
      setSyncStatus('Conectado con Google Sheets');
    } catch (error) {
      console.error(error);
      setSyncStatus('Error de carga. Trabajando en modo local');
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

    setSyncStatus('Sincronizando...');
    saveTimersRef.current[key] = setTimeout(async () => {
      try {
        await persistScore(studentId, weekIndex, value);
        setSyncStatus('Guardado en Google Sheets');
      } catch (error) {
        console.error(error);
        setSyncStatus('Error al guardar en Google Sheets');
      }
    }, 450);
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
            <p className="text-slate-500 font-medium">Dr. Denis Vanegas Corrales | Control Semestral de Acumulados</p>
            <p className="text-xs text-slate-500 mt-1">Estado: {syncStatus}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-semibold text-sm"
            >
              <FileSpreadsheet size={18} />
              Exportar para Google Sheets
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="flex gap-2 mb-6 bg-slate-200/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'grades' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Planilla de Notas
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'rubric' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Rúbrica de Evaluación
          </button>
        </div>

        {activeTab === 'grades' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-bottom border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r w-12">No.</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-12 bg-slate-50 z-10 border-r min-w-[250px]">Nombre del Estudiante</th>
                    {weeks.map((w) => (
                      <th key={w} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-r min-w-[60px]">
                        {w}
                      </th>
                    ))}
                    <th className="p-4 text-xs font-bold text-blue-700 uppercase tracking-wider text-center bg-blue-50 sticky right-0 z-10 border-l">Prom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-400 sticky left-0 bg-white border-r">{student.id}</td>
                      <td className="p-4 text-sm font-semibold text-slate-700 sticky left-12 bg-white border-r">{student.nombre}</td>
                      {student.scores.map((score, wIndex) => (
                        <td key={wIndex} className="p-1 border-r text-center">
                          <input
                            type="text"
                            value={score}
                            onChange={(e) => handleScoreChange(student.id, wIndex, e.target.value)}
                            className={`w-full h-10 text-center text-sm border-none focus:ring-2 focus:ring-blue-400 focus:outline-none rounded ${
                              score < 60 && score !== '' ? 'text-red-600 font-bold bg-red-50' : 'text-slate-700'
                            }`}
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="p-4 text-sm font-bold text-center bg-blue-50 sticky right-0 z-10 border-l">
                        <span className={calculateAverage(student.scores) < 60 ? 'text-red-600' : 'text-blue-700'}>
                          {calculateAverage(student.scores)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 text-xs text-slate-500 flex gap-4">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-50 border border-red-200"></div>
                Nota Reprobatoria (&lt;60)
              </span>
              <span>* Las notas se guardan mientras la pestaña esté abierta. Use el botón exportar para guardar permanentemente.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Info size={20} />
                Criterios de Evaluación Semanal
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="font-bold text-blue-900">1. Historia Clínica (30%)</p>
                  <p className="text-sm text-blue-800">Anamnesis completa, motivo de consulta claro y cronología lógica.</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="font-bold text-emerald-900">2. Examen Físico (30%)</p>
                  <p className="text-sm text-emerald-800">Técnicas correctas de semiotecnia y descripción precisa de hallazgos.</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="font-bold text-amber-900">3. Razonamiento Clínico (30%)</p>
                  <p className="text-sm text-amber-800">Planteamiento de síndromes y diagnósticos diferenciales.</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <p className="font-bold text-purple-900">4. Comunicación y Ética (10%)</p>
                  <p className="text-sm text-purple-800">Relación médico-paciente y uso de terminología médica.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Instrucciones de Uso</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <ChevronRight size={16} className="text-blue-500 shrink-0" />
                  <span>Ingrese las calificaciones (0-100) en las casillas correspondientes a cada semana (S1 a S16).</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight size={16} className="text-blue-500 shrink-0" />
                  <span>El promedio se calculará automáticamente a medida que agregue notas.</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight size={16} className="text-blue-500 shrink-0" />
                  <span>Al finalizar el día o la semana, presione "Exportar para Google Sheets" para descargar un archivo .csv.</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight size={16} className="text-blue-500 shrink-0" />
                  <span>Abra su Google Drive, suba el archivo y ábralo con Hojas de cálculo de Google para llevar el registro en la nube.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
