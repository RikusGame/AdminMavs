import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  Bell,
  Send,
  Loader2,
  Users,
  User,
  Car,
  Target,
} from "lucide-react";
import { db, auth } from "../config/firebase";
import { formatFecha } from "../utils/fechas";
import { BuscadorUsuario } from "../components/BuscadorUsuario";

const AUDIENCIAS = [
  { value: "todos", label: "Todos", icon: Users },
  { value: "pasajeros", label: "Pasajeros", icon: User },
  { value: "taxistas", label: "Conductoras", icon: Car },
  { value: "uidEspecifico", label: "Un usuario", icon: Target },
];

const AUDIENCIA_LABEL = {
  todos: "Todos",
  pasajeros: "Pasajeros",
  taxistas: "Conductoras",
  uidEspecifico: "Usuario específico",
};

export function Notificaciones() {
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [audiencia, setAudiencia] = useState("todos");
  const [uidObjetivo, setUidObjetivo] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const [enviadas, setEnviadas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notificacionesAdmin"),
      orderBy("sentAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEnviadas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando notificaciones:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (!titulo.trim()) return setError("El título es obligatorio.");
    if (!cuerpo.trim()) return setError("El mensaje es obligatorio.");
    if (audiencia === "uidEspecifico" && !uidObjetivo.trim()) {
      return setError("Indica el UID del usuario destino.");
    }

    setEnviando(true);
    try {
      await addDoc(collection(db, "notificacionesAdmin"), {
        title: titulo.trim(),
        body: cuerpo.trim(),
        audiencia,
        uidObjetivo: audiencia === "uidEspecifico" ? uidObjetivo.trim() : "",
        imageUrl: imageUrl.trim(),
        sentBy: auth.currentUser?.email || "admin",
        sentAt: serverTimestamp(),
        sentCount: 0,
        status: "enviado",
      });
      setOk(true);
      setTitulo("");
      setCuerpo("");
      setUidObjetivo("");
      setImageUrl("");
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err?.message || "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1>Notificaciones</h1>
          <p className="text-sm text-gray-500">
            Envía avisos a los usuarios de la app
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Panel de Control {">"} Notificaciones
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-green-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Nueva notificación</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {ok && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              ✅ Notificación enviada. Aparecerá en la bandeja de la app.
            </div>
          )}

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600">
                Título *
              </label>
              <input
                className={inputCls}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. ¡Promoción de fin de semana!"
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Mensaje *
              </label>
              <textarea
                className={`${inputCls} h-24 resize-none`}
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                placeholder="Escribe el mensaje que verán los usuarios..."
                maxLength={300}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Audiencia
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AUDIENCIAS.map((a) => {
                  const Icon = a.icon;
                  const active = audiencia === a.value;
                  return (
                    <button
                      type="button"
                      key={a.value}
                      onClick={() => setAudiencia(a.value)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                        active
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-transparent"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {audiencia === "uidEspecifico" && (
              <BuscadorUsuario
                onSelect={(uid) => setUidObjetivo(uid)}
              />
            )}
            <div>
              <label className="text-xs font-medium text-gray-600">
                Imagen (URL, opcional)
              </label>
              <input
                className={inputCls}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition disabled:opacity-60"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar notificación
                </>
              )}
            </button>
          </form>

          <p className="mt-3 text-[11px] text-gray-400 leading-snug">
            La notificación aparece en la bandeja de la app (campana). El envío
            como push del sistema requiere la Cloud Function de notificaciones.
          </p>
        </div>

        {/* Historial */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Enviadas</h2>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
          ) : enviadas.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              Aún no enviaste notificaciones.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {enviadas.map((n) => (
                <div
                  key={n.id}
                  className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-gray-800 text-sm">
                      {n.title}
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                      {AUDIENCIA_LABEL[n.audiencia] || n.audiencia}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{n.body}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {formatFecha(n.sentAt)} · {n.sentBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm mt-1";

export default Notificaciones;
