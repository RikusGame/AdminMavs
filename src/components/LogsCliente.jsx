import { useState, useEffect } from 'react';
import { db } from "../config/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { AlertCircle, AlertTriangle, Info, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// Estilos por nivel de log.
const NIVEL_STYLE = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', Icon: AlertCircle, label: 'Error' },
  warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', Icon: AlertTriangle, label: 'Aviso' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', Icon: Info, label: 'Info' },
};

function fmtFecha(fecha) {
  try {
    if (!fecha) return '';
    let d;
    if (fecha.toDate) d = fecha.toDate();
    else if (fecha.seconds) d = new Date(fecha.seconds * 1000);
    else d = new Date(fecha);
    return d.toLocaleString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function tsSeconds(fecha) {
  if (!fecha) return 0;
  if (fecha.seconds) return fecha.seconds;
  if (fecha.toDate) return fecha.toDate().getTime() / 1000;
  const t = new Date(fecha).getTime();
  return isNaN(t) ? 0 : t / 1000;
}

/**
 * Logs por cliente. Lee la colección `logsClientes` filtrando por uid.
 * La query NO usa orderBy (evita índice compuesto uid+fecha): se ordena en
 * el cliente por fecha desc.
 */
export function LogsCliente({ uid }) {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState({});
  const [soloErrores, setSoloErrores] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setCargando(true);
    const q = query(collection(db, 'logsClientes'), where('uid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => tsSeconds(b.fecha) - tsSeconds(a.fecha));
        setLogs(items);
        setCargando(false);
      },
      (err) => {
        console.error('Error cargando logs del cliente:', err);
        setCargando(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const nErrores = logs.filter((l) => (l.nivel || '') === 'error').length;
  const visibles = soloErrores ? logs.filter((l) => (l.nivel || '') === 'error') : logs;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Actividad / Logs</h2>
          <p className="text-sm text-gray-500">
            Errores y eventos registrados de este cliente
            {logs.length > 0 && (
              <span className="ml-1 text-gray-400">
                · {logs.length} registros{nErrores > 0 ? ` · ${nErrores} errores` : ''}
              </span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={soloErrores}
            onChange={(e) => setSoloErrores(e.target.checked)}
          />
          Solo errores
        </label>
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 text-gray-500 py-6 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando logs...
        </div>
      ) : visibles.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center">
          {logs.length === 0 ? 'Sin registros para este cliente.' : 'No hay errores registrados.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {visibles.map((log) => {
            const st = NIVEL_STYLE[log.nivel] || NIVEL_STYLE.info;
            const Icon = st.Icon;
            const abierto = !!expandido[log.id];
            const tieneDetalle = log.detalle && Object.keys(log.detalle).length > 0;
            return (
              <div key={log.id} className={`border ${st.border} ${st.bg} rounded-lg p-3`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${st.text} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase ${st.text}`}>{st.label}</span>
                      <span className="text-sm font-semibold text-gray-800">{log.evento}</span>
                      {log.rol && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{log.rol}</span>
                      )}
                      {log.plataforma && <span className="text-xs text-gray-400">{log.plataforma}</span>}
                    </div>
                    {log.mensaje && (
                      <p className="text-sm text-gray-700 mt-1 break-words">{log.mensaje}</p>
                    )}
                    {tieneDetalle && (
                      <button
                        onClick={() => setExpandido((p) => ({ ...p, [log.id]: !abierto }))}
                        className="flex items-center gap-1 text-xs text-gray-500 mt-1 hover:text-gray-700"
                      >
                        {abierto ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Detalle
                      </button>
                    )}
                    {abierto && tieneDetalle && (
                      <pre className="text-xs bg-white/70 border border-gray-200 rounded p-2 mt-1 overflow-x-auto text-gray-600">
                        {JSON.stringify(log.detalle, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {fmtFecha(log.fecha)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LogsCliente;
