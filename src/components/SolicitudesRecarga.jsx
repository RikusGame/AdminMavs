import { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Car,
  Loader2,
  ExternalLink,
} from "lucide-react";

// Bandeja de solicitudes de recarga por QR.
// La app (RecargaComprobanteService) crea docs en `solicitudesRecarga/{id}`
// con estado 'pendiente' cuando el conductor/pasajero envía su comprobante.
// Antes NADIE las leía en este admin: el usuario mandaba el comprobante y el
// admin jamás se enteraba. Al aprobar, se acredita el saldo en la billetera
// real (taxistas|pasajeros/{uid}/billetera/saldo) igual que AgregarMontoModal.
export function SolicitudesRecarga() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null); // id en proceso
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [rechazando, setRechazando] = useState(null); // solicitud a rechazar
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [filtro, setFiltro] = useState("pendiente"); // pendiente | todas

  useEffect(() => {
    const q = query(
      collection(db, "solicitudesRecarga"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSolicitudes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando solicitudes de recarga:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const visibles = filtro === "pendiente" ? pendientes : solicitudes;

  const aprobar = async (sol) => {
    if (procesando) return;
    const monto = Number(sol.monto || 0);
    if (!(monto > 0)) {
      alert("La solicitud no tiene un monto válido.");
      return;
    }
    if (
      !window.confirm(
        `¿Aprobar la recarga de Bs ${monto.toFixed(2)} para ${
          sol.nombre || sol.uid
        }? Se acreditará a su billetera.`
      )
    ) {
      return;
    }
    setProcesando(sol.id);
    try {
      const base = sol.tipoUsuario === "pasajero" ? "pasajeros" : "taxistas";
      const adminEmail = auth.currentUser?.email || "admin";

      // Transacción: si otro admin ya la procesó, aborta sin doble crédito.
      await runTransaction(db, async (tx) => {
        const solRef = doc(db, "solicitudesRecarga", sol.id);
        const solSnap = await tx.get(solRef);
        if (!solSnap.exists() || solSnap.data().estado !== "pendiente") {
          throw new Error("Esta solicitud ya fue procesada.");
        }

        const saldoRef = doc(db, base, sol.uid, "billetera", "saldo");
        const saldoSnap = await tx.get(saldoRef);
        const saldoActual = saldoSnap.exists()
          ? Number(saldoSnap.data().saldo || 0)
          : 0;

        tx.set(
          saldoRef,
          {
            saldo: saldoActual + monto,
            ultimaActualizacion: serverTimestamp(),
          },
          { merge: true }
        );

        // Entrada en el historial que ya lee la app y PerfilConductor.
        const histRef = doc(
          collection(db, base, sol.uid, "billetera", "historial", "recargas")
        );
        tx.set(histRef, {
          estado: "completado",
          fecha: serverTimestamp(),
          metodoPago: "qr",
          monto,
          notas: sol.referencia
            ? `Recarga QR aprobada (ref: ${sol.referencia})`
            : "Recarga QR aprobada",
          solicitudId: sol.id,
          aprobadoPor: adminEmail,
        });

        tx.update(solRef, {
          estado: "aprobado",
          aprobadoPor: adminEmail,
          aprobadoAt: serverTimestamp(),
        });
      });

      // Copia global para reportes (best-effort, igual que AgregarMontoModal).
      try {
        await addDoc(collection(db, "billetera_transacciones"), {
          estado: "completado",
          fecha: serverTimestamp(),
          metodoPago: "qr",
          monto,
          notas: "Recarga QR aprobada",
          taxistaId: sol.tipoUsuario === "pasajero" ? null : sol.uid,
          pasajeroId: sol.tipoUsuario === "pasajero" ? sol.uid : null,
          solicitudId: sol.id,
        });
      } catch (e) {
        console.warn("No se pudo crear la copia global:", e);
      }
    } catch (e) {
      console.error("Error aprobando recarga:", e);
      alert("No se pudo aprobar: " + (e.message || e));
    } finally {
      setProcesando(null);
    }
  };

  const rechazar = async () => {
    const sol = rechazando;
    if (!sol || procesando) return;
    if (!motivoRechazo.trim()) {
      alert("Escribe el motivo del rechazo.");
      return;
    }
    setProcesando(sol.id);
    try {
      const adminEmail = auth.currentUser?.email || "admin";
      await runTransaction(db, async (tx) => {
        const solRef = doc(db, "solicitudesRecarga", sol.id);
        const solSnap = await tx.get(solRef);
        if (!solSnap.exists() || solSnap.data().estado !== "pendiente") {
          throw new Error("Esta solicitud ya fue procesada.");
        }
        tx.update(solRef, {
          estado: "rechazado",
          motivoRechazo: motivoRechazo.trim(),
          rechazadoPor: adminEmail,
          rechazadoAt: serverTimestamp(),
        });
      });
      setRechazando(null);
      setMotivoRechazo("");
    } catch (e) {
      console.error("Error rechazando recarga:", e);
      alert("No se pudo rechazar: " + (e.message || e));
    } finally {
      setProcesando(null);
    }
  };

  const fmtFecha = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : null;
      if (!d) return "—";
      return d.toLocaleString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const badgeEstado = (estado) => {
    if (estado === "pendiente")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
          <Clock className="w-3.5 h-3.5" /> Pendiente
        </span>
      );
    if (estado === "aprobado")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
          <CheckCircle className="w-3.5 h-3.5" /> Aprobado
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
        <XCircle className="w-3.5 h-3.5" /> Rechazado
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">
              Solicitudes de recarga (QR)
            </h2>
            <p className="text-xs text-gray-500">
              Comprobantes enviados desde la app. Al aprobar, el saldo se
              acredita a la billetera.
            </p>
          </div>
          {pendientes.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold">
              {pendientes.length}
            </span>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setFiltro("pendiente")}
            className={`px-3 py-1.5 font-medium ${
              filtro === "pendiente"
                ? "bg-green-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Pendientes ({pendientes.length})
          </button>
          <button
            onClick={() => setFiltro("todas")}
            className={`px-3 py-1.5 font-medium ${
              filtro === "todas"
                ? "bg-green-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todas ({solicitudes.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
          {filtro === "pendiente"
            ? "No hay solicitudes pendientes. 🎉"
            : "Todavía no hay solicitudes de recarga."}
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((s) => (
            <div
              key={s.id}
              className="border border-gray-200 rounded-xl p-4 flex flex-wrap md:flex-nowrap gap-4 items-start"
            >
              {/* Comprobante */}
              <button
                onClick={() => s.comprobanteUrl && setImagenAmpliada(s.comprobanteUrl)}
                className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center"
                title="Ver comprobante"
              >
                {s.comprobanteUrl ? (
                  <img
                    src={s.comprobanteUrl}
                    alt="Comprobante"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Datos */}
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">
                    {s.nombre || "Sin nombre"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {s.tipoUsuario === "pasajero" ? (
                      <>
                        <User className="w-3 h-3" /> Pasajero
                      </>
                    ) : (
                      <>
                        <Car className="w-3 h-3" /> Conductora
                      </>
                    )}
                  </span>
                  {badgeEstado(s.estado)}
                </div>
                <p className="text-2xl font-extrabold text-green-600 mt-1">
                  Bs {Number(s.monto || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmtFecha(s.createdAt)}
                  {s.referencia ? ` · Ref: ${s.referencia}` : ""}
                </p>
                {s.estado === "rechazado" && s.motivoRechazo && (
                  <p className="text-xs text-red-600 mt-1">
                    Motivo: {s.motivoRechazo}
                  </p>
                )}
                {s.estado === "aprobado" && s.aprobadoPor && (
                  <p className="text-xs text-gray-400 mt-1">
                    Aprobada por {s.aprobadoPor}
                  </p>
                )}
              </div>

              {/* Acciones */}
              {s.estado === "pendiente" && (
                <div className="flex md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => aprobar(s)}
                    disabled={procesando === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-60"
                  >
                    {procesando === s.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setRechazando(s);
                      setMotivoRechazo("");
                    }}
                    disabled={procesando === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 transition disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: imagen ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setImagenAmpliada(null)}
        >
          <img
            src={imagenAmpliada}
            alt="Comprobante"
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Modal: motivo de rechazo */}
      {rechazando && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <h3 className="font-bold text-gray-800 mb-1">Rechazar recarga</h3>
            <p className="text-sm text-gray-500 mb-3">
              {rechazando.nombre || rechazando.uid} · Bs{" "}
              {Number(rechazando.monto || 0).toFixed(2)}
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (ej: el comprobante no corresponde / monto no coincide)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none text-sm resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRechazando(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={rechazar}
                disabled={procesando === rechazando.id}
                className="rounded-lg bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {procesando === rechazando.id ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitudesRecarga;
