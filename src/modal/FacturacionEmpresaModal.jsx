import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  X,
  FileText,
  FileSpreadsheet,
  Loader2,
  Building2,
  CalendarRange,
} from "lucide-react";
import { db } from "../config/firebase";
import { toDate } from "../utils/fechas";
// generarFacturaEmpresa arrastra jspdf + xlsx (pesados): se importan on-demand
// dentro del handler para que no viajen en la carga inicial. (Tarjeta [224])

// Devuelve [desde, hasta] del periodo actual según el ciclo.
function periodoActual(ciclo) {
  const hoy = new Date();
  const hasta = new Date(hoy);
  hasta.setHours(23, 59, 59, 999);
  const desde = new Date(hoy);
  desde.setHours(0, 0, 0, 0);

  if (ciclo === "semanal") {
    const dia = (desde.getDay() + 6) % 7; // lunes = 0
    desde.setDate(desde.getDate() - dia);
  } else if (ciclo === "quincenal") {
    desde.setDate(hoy.getDate() <= 15 ? 1 : 16);
  } else {
    desde.setDate(1); // mensual
  }
  return { desde, hasta };
}

function toInputDate(d) {
  if (!d) return "";
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function FacturacionEmpresaModal({ empresa, onClose }) {
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);

  const inicial = periodoActual(empresa.cicloFacturacion);
  const [desde, setDesde] = useState(toInputDate(inicial.desde));
  const [hasta, setHasta] = useState(toInputDate(inicial.hasta));

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "empresas", empresa.id, "viajes")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setViajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando viajes:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [empresa.id]);

  const rango = useMemo(() => {
    const d = desde ? new Date(desde + "T00:00:00") : null;
    const h = hasta ? new Date(hasta + "T23:59:59") : null;
    return { desde: d, hasta: h };
  }, [desde, hasta]);

  const filtrados = useMemo(() => {
    return viajes
      .filter((v) => {
        const f = toDate(v.completadoEn || v.createdAt);
        if (!f) return false;
        if (rango.desde && f < rango.desde) return false;
        if (rango.hasta && f > rango.hasta) return false;
        return true;
      })
      .sort((a, b) => {
        const fa = toDate(a.completadoEn || a.createdAt);
        const fb = toDate(b.completadoEn || b.createdAt);
        return (fa?.getTime() || 0) - (fb?.getTime() || 0);
      });
  }, [viajes, rango]);

  const total = filtrados.reduce((acc, v) => acc + Number(v.total || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Facturación — {empresa.nombre}
              </h2>
              <p className="text-xs text-gray-500">
                NIT {empresa.nit || "—"} · Ciclo{" "}
                {empresa.cicloFacturacion || "mensual"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {/* Selector de periodo */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" /> Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-green-500"
              />
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Total del periodo</div>
              <div className="text-2xl font-bold text-green-600">
                Bs {total.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando carreras...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No hay carreras completadas en este periodo.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500">
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-left py-2 px-3">Pasajero</th>
                    <th className="text-left py-2 px-3">Origen → Destino</th>
                    <th className="text-right py-2 px-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((v) => {
                    const f = toDate(v.completadoEn || v.createdAt);
                    return (
                      <tr key={v.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 whitespace-nowrap">
                          {f
                            ? f.toLocaleDateString("es-BO", {
                                day: "2-digit",
                                month: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {v.solicitanteNombre || v.solicitanteUid || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {(v.origen || "—") + " → " + (v.destino || "—")}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          Bs {Number(v.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t">
          <span className="text-xs text-gray-500">
            {filtrados.length} carrera(s) en el periodo
          </span>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const { exportarFacturacionExcel } = await import(
                  "../utils/generarFacturaEmpresa"
                );
                exportarFacturacionExcel(empresa, filtrados, rango);
              }}
              disabled={filtrados.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={async () => {
                const { generarFacturaEmpresaPDF } = await import(
                  "../utils/generarFacturaEmpresa"
                );
                generarFacturaEmpresaPDF(empresa, filtrados, rango);
              }}
              disabled={filtrados.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Generar factura PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacturacionEmpresaModal;
