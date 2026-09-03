import { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Phone, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// Documento único de configuración. Vive en la misma colección que el resto
// (`config/comisiones`, `config/tarifas`), cuyas reglas ya permiten lectura a
// cualquier usuaria autenticada y escritura sólo a admin.
const COL = "config";
const DOC = "contacto";

// El que estaba escrito a mano en la app antes de la tarjeta 1401. Si nadie
// guardó nada todavía, la app usa este mismo valor, así que se muestra acá para
// que se vea qué número está sirviendo en este momento.
const TELEFONO_POR_DEFECTO = "77991640";

// Mismo criterio que valida la app: se cuentan los dígitos, no los caracteres,
// para aceptar "+591 700-00000".
const MINIMO_DIGITOS = 7;

function contarDigitos(valor) {
  return (valor.match(/\d/g) || []).length;
}

export function ContactoSoporte() {
  const [telefono, setTelefono] = useState("");
  const [guardado, setGuardado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COL, DOC),
      (snap) => {
        const valor = snap.exists() ? snap.data().telefono ?? "" : "";
        const texto = String(valor);
        setGuardado(snap.exists() ? texto : null);
        // Sólo se pisa lo que hay en el input en la primera carga, para no
        // borrar lo que la administradora está escribiendo si llega un cambio.
        setTelefono((actual) => (actual === "" ? texto : actual));
        setCargando(false);
      },
      (error) => {
        setMensaje({
          tipo: "error",
          texto: `No se pudo leer la configuración: ${error.message}`,
        });
        setCargando(false);
      }
    );
    return unsub;
  }, []);

  const valor = telefono.trim();
  const digitos = contarDigitos(valor);
  const esValido = digitos >= MINIMO_DIGITOS;
  const hayCambios = valor !== (guardado ?? "");

  // Lo que realmente está usando la app en este momento.
  const enUsoPorLaApp =
    guardado && contarDigitos(guardado) >= MINIMO_DIGITOS
      ? guardado
      : TELEFONO_POR_DEFECTO;

  const guardar = async () => {
    if (!esValido || guardando) return;

    setGuardando(true);
    setMensaje(null);
    try {
      await setDoc(
        doc(db, COL, DOC),
        {
          telefono: valor,
          actualizadoPor: auth.currentUser?.email || "admin",
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );
      setMensaje({
        tipo: "ok",
        texto: "Número actualizado. La app lo toma la próxima vez que se abre la pantalla de contacto.",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: `No se pudo guardar: ${error.message}`,
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Phone className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Número de contacto
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Es el número que ven las usuarias en la pantalla de Información de la
          app, y al que las lleva el botón de WhatsApp.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            En uso ahora
          </p>
          <p className="text-lg font-semibold text-gray-800">{enUsoPorLaApp}</p>
          {!guardado && (
            <p className="text-xs text-gray-500 mt-1">
              Todavía no se guardó ninguno, así que la app usa el número que
              venía en el código. Guardá uno acá para reemplazarlo.
            </p>
          )}
        </div>

        <label
          htmlFor="telefono-contacto"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nuevo número <span className="text-red-500">*</span>
        </label>
        <input
          id="telefono-contacto"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 77991640 o +591 77991640"
          disabled={guardando}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
        />
        {valor !== "" && !esValido && (
          <p className="flex items-center gap-2 text-sm text-red-600 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Tiene que tener al menos {MINIMO_DIGITOS} dígitos. La app descarta
            los valores más cortos y vuelve al número anterior.
          </p>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={guardar}
            disabled={!esValido || !hayCambios || guardando}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {guardando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar número
              </>
            )}
          </button>
          {!hayCambios && valor !== "" && (
            <span className="text-sm text-gray-500">
              No hay cambios para guardar.
            </span>
          )}
        </div>

        {mensaje && (
          <div
            role="alert"
            className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${
              mensaje.tipo === "ok"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {mensaje.tipo === "ok" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm">{mensaje.texto}</p>
          </div>
        )}
      </div>
    </div>
  );
}
