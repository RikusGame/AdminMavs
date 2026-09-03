import { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import {
  Phone,
  Mail,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// Documento único de configuración. Vive en la misma colección que el resto
// (`config/comisiones`, `config/tarifas`), cuyas reglas ya permiten lectura a
// cualquier usuaria autenticada y escritura sólo a admin.
const COL = "config";
const DOC = "contacto";

// Los que estaban escritos a mano en la app, antes de las tarjetas 1401 y 1456.
// Si nadie guardó nada todavía, la app usa estos mismos valores, así que se
// muestran acá para que se vea qué está sirviendo en este momento.
//
// El correo por defecto es un Gmail PERSONAL que quedó publicado como canal
// oficial de soporte: reemplazarlo es justamente el punto de la tarjeta 1456.
const TELEFONO_POR_DEFECTO = "77991640";
const EMAIL_POR_DEFECTO = "rogerponce761@gmail.com";

// Mismo criterio que valida la app: se cuentan los dígitos, no los caracteres,
// para aceptar "+591 700-00000".
const MINIMO_DIGITOS = 7;

// Y el mismo criterio laxo para el correo: algo, arroba, algo, punto, algo, sin
// espacios. No busca cubrir el estándar completo, sólo descartar lo que seguro
// no funcionaría al abrir el cliente de correo.
const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function contarDigitos(valor) {
  return (valor.match(/\d/g) || []).length;
}

function telefonoValido(valor) {
  return contarDigitos(valor) >= MINIMO_DIGITOS;
}

function emailValido(valor) {
  return RE_EMAIL.test(valor);
}

export function ContactoSoporte() {
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [guardadoTelefono, setGuardadoTelefono] = useState(null);
  const [guardadoEmail, setGuardadoEmail] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COL, DOC),
      (snap) => {
        const datos = snap.exists() ? snap.data() : {};
        const tel = String(datos.telefono ?? "");
        const mail = String(datos.email ?? "");

        setGuardadoTelefono(snap.exists() ? tel : null);
        setGuardadoEmail(snap.exists() ? mail : null);
        // Sólo se pisa lo que hay en los inputs en la primera carga, para no
        // borrar lo que la administradora está escribiendo si llega un cambio.
        setTelefono((actual) => (actual === "" ? tel : actual));
        setEmail((actual) => (actual === "" ? mail : actual));
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

  const telValor = telefono.trim();
  const emailValor = email.trim();

  const telOk = telefonoValido(telValor);
  const emailOk = emailValido(emailValor);
  const todoValido = telOk && emailOk;

  const hayCambios =
    telValor !== (guardadoTelefono ?? "") ||
    emailValor !== (guardadoEmail ?? "");

  // Lo que realmente está usando la app en este momento. Se evalúa campo por
  // campo con el mismo criterio que la app: uno mal cargado no arrastra al otro.
  const telEnUso =
    guardadoTelefono && telefonoValido(guardadoTelefono)
      ? guardadoTelefono
      : TELEFONO_POR_DEFECTO;
  const emailEnUso =
    guardadoEmail && emailValido(guardadoEmail)
      ? guardadoEmail
      : EMAIL_POR_DEFECTO;

  const usandoEmailPersonal = emailEnUso === EMAIL_POR_DEFECTO;

  const guardar = async () => {
    if (!todoValido || guardando) return;

    setGuardando(true);
    setMensaje(null);
    try {
      await setDoc(
        doc(db, COL, DOC),
        {
          telefono: telValor,
          email: emailValor,
          actualizadoPor: auth.currentUser?.email || "admin",
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );
      setMensaje({
        tipo: "ok",
        texto:
          "Datos actualizados. La app los toma la próxima vez que se abre la pantalla de contacto.",
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
            Contacto de soporte
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Son el número y el correo que ven las usuarias en la pantalla de
          Información de la app, y a los que las llevan los botones de WhatsApp
          y de escribir.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            En uso ahora
          </p>
          <p className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {telEnUso}
          </p>
          <p className="flex items-center gap-2 text-base font-semibold text-gray-800 mt-1 break-all">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            {emailEnUso}
          </p>
          {usandoEmailPersonal && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-3">
              ⚠️ El correo en uso es una cuenta personal que quedó en el código.
              Guardá acá el correo oficial de soporte para reemplazarlo.
            </p>
          )}
        </div>

        <label
          htmlFor="telefono-contacto"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Número de contacto <span className="text-red-500">*</span>
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
        {telValor !== "" && !telOk && (
          <p className="flex items-center gap-2 text-sm text-red-600 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Tiene que tener al menos {MINIMO_DIGITOS} dígitos. La app descarta
            los valores más cortos y vuelve al número anterior.
          </p>
        )}

        <label
          htmlFor="email-contacto"
          className="block text-sm font-medium text-gray-700 mb-2 mt-5"
        >
          Correo de soporte <span className="text-red-500">*</span>
        </label>
        <input
          id="email-contacto"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ej: soporte@mujeresalvolante.bo"
          disabled={guardando}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
        />
        {emailValor !== "" && !emailOk && (
          <p className="flex items-center gap-2 text-sm text-red-600 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No parece un correo válido. La app descarta los valores que no lo
            son y vuelve al correo anterior.
          </p>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={guardar}
            disabled={!todoValido || !hayCambios || guardando}
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
                Guardar cambios
              </>
            )}
          </button>
          {!hayCambios && telValor !== "" && (
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
