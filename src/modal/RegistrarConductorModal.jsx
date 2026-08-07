import { useState, useEffect } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../config/firebase";
import {
  X,
  Loader2,
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { firebaseConfig } from "../config/firebase";
import { generarPassword } from "../utils/password";
import { enviarCorreoBienvenidaConductor } from "../utils/sendWelcomeEmail";
import { UploadImagen } from "../components/UploadImagen";

const DEPARTAMENTOS = [
  "La Paz",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
];

const DOCS_OBLIGATORIOS = [
  { id: "fotoConductor", label: "Foto del Conductor" },
  { id: "fotoCarneIdentidadAnverso", label: "C.I. Anverso" },
  { id: "fotoCarneIdentidadReverso", label: "C.I. Reverso" },
  { id: "fotoLicenciaConducirAnverso", label: "Licencia Anverso" },
  { id: "fotoLicenciaConducirReverso", label: "Licencia Reverso" },
];

const DOCS_OPCIONALES = [
  { id: "fotoSoat", label: "SOAT" },
  { id: "fotoRevisionTecnica", label: "Revisión Técnica" },
  { id: "fotoPermisoCirculacion", label: "Permiso de Circulación" },
  { id: "fotoAntecedentesPenales", label: "Antecedentes Penales" },
  { id: "fotoVehiculo1", label: "Foto Vehículo 1" },
  { id: "fotoVehiculo2", label: "Foto Vehículo 2" },
];

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function RegistrarConductorModal({ onClose }) {
  // Perfil
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigoPais, setCodigoPais] = useState("+591");
  const [telefono, setTelefono] = useState("");
  const [ci, setCi] = useState("");
  const [genero, setGenero] = useState("Femenino");
  const [departamento, setDepartamento] = useState("");

  // Vehículo
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [numeroAsientos, setNumeroAsientos] = useState("");

  // Servicio con el que trabajará (Taxi, Moto taxi...). Es lo que filtra el
  // despacho: sin esto la conductora recibe TODAS las solicitudes sin filtro.
  const [servicios, setServicios] = useState([]);
  const [servicioSel, setServicioSel] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "servicios"), where("activo", "==", true))
        );
        const lista = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        setServicios(lista);
        if (lista.length === 1) setServicioSel(lista[0].nombre || "");
      } catch (e) {
        console.error("Error cargando servicios:", e);
      }
    })();
  }, []);

  const [habilitado, setHabilitado] = useState(true);

  // Imágenes
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [docs, setDocs] = useState({});

  const [saving, setSaving] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null); // { correo, password, emailSent }
  const [copiado, setCopiado] = useState(false);

  const setDoc_ = (id, file) => setDocs((prev) => ({ ...prev, [id]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!correo.trim()) return setError("El correo es obligatorio.");
    if (servicios.length > 0 && !servicioSel) {
      return setError("Selecciona el servicio con el que trabajará.");
    }
    const faltan = DOCS_OBLIGATORIOS.filter((d) => !docs[d.id]);
    if (faltan.length > 0) {
      return setError(
        "Faltan documentos obligatorios: " +
          faltan.map((d) => d.label).join(", ")
      );
    }

    setSaving(true);
    const password = generarPassword(12);
    let secondaryApp;
    try {
      // App secundaria: nos autenticamos COMO el conductor nuevo para que
      // las subidas y el doc cumplan reglas por dueño (request.auth.uid == uid).
      setProgreso("Creando cuenta de acceso...");
      secondaryApp = initializeApp(firebaseConfig, "conductor-" + Date.now());
      const secAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(
        secAuth,
        correo.trim(),
        password
      );
      const uid = cred.user.uid;
      const secDb = getFirestore(secondaryApp);
      const secStorage = getStorage(secondaryApp);

      const subir = async (file, path) => {
        const r = ref(secStorage, path);
        await uploadBytes(r, file);
        return await getDownloadURL(r);
      };

      // Foto de perfil
      let fotoPerfilUrl = "";
      if (fotoPerfil) {
        setProgreso("Subiendo foto de perfil...");
        fotoPerfilUrl = await subir(
          fotoPerfil,
          `taxistas/${uid}/perfilTaxista/foto.jpg`
        );
      }

      // Documentos
      const docUrls = {};
      const verificados = {};
      const todosDocs = [...DOCS_OBLIGATORIOS, ...DOCS_OPCIONALES];
      for (const d of todosDocs) {
        const file = docs[d.id];
        if (!file) continue;
        setProgreso(`Subiendo ${d.label}...`);
        docUrls[d.id] = await subir(
          file,
          `taxistas/${uid}/documentosVehiculo/${d.id}.jpg`
        );
        verificados[`verificado${capitalizar(d.id)}`] = true;
      }

      setProgreso("Guardando perfil del conductor...");
      const telefonoCompleto = telefono.trim()
        ? `${codigoPais}${telefono.trim()}`
        : "";

      await setDoc(doc(secDb, "taxistas", uid), {
        uidTaxista: uid,
        modo: "taxista",
        empresa: "mujeresalvolante",
        estado: habilitado ? "Aprobado" : "Pendiente",
        fechaRegistro: serverTimestamp(),
        registradoPorAdmin: true,
        perfilTaxista: {
          nombre: nombre.trim(),
          ci: ci.trim(),
          ci_numero: ci.trim(),
          telefono: telefono.trim(),
          telefonoCompleto,
          codigoPais,
          correo: correo.trim(),
          email: correo.trim(),
          genero,
          departamento,
          fotoPerfil: fotoPerfilUrl,
          provider: "admin",
          datosCompletos: true,
          fechaRegistro: serverTimestamp(),
        },
        documentosVehiculo: {
          empresa: "mujeresalvolante",
          marca: marca.trim(),
          modelo: modelo.trim(),
          color: color.trim(),
          placa: placa.trim().toUpperCase(),
          tipoVehiculo: tipoVehiculo.trim(),
          numeroAsientos: numeroAsientos.trim(),
          departamentoServicio: departamento,
          ...(servicioSel ? { servicioSeleccionado: servicioSel } : {}),
          habilitado,
          ...docUrls,
          ...verificados,
        },
      });

      await signOut(secAuth);

      // Correo de bienvenida (no bloquea el alta si aún no está configurado)
      setProgreso("Enviando correo de bienvenida...");
      const mail = await enviarCorreoBienvenidaConductor({
        uid,
        nombre: nombre.trim(),
        password,
      });

      setResultado({ correo: correo.trim(), password, emailSent: mail.sent });
    } catch (err) {
      let msg = err?.message || String(err);
      if (err?.code === "auth/email-already-in-use") {
        msg = "Ese correo ya tiene una cuenta. Usa otro correo para el conductor.";
      } else if (err?.code === "auth/invalid-email") {
        msg = "El correo no es válido.";
      } else if (err?.code === "storage/unauthorized") {
        msg =
          "Las reglas de Storage no permiten subir las fotos. (La cuenta se creó; ajusta las reglas de Storage.)";
      } else if (err?.code === "permission-denied") {
        msg =
          "Las reglas de Firestore no permiten guardar el conductor. (La cuenta se creó; ajusta las reglas.)";
      }
      setError(msg);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {
          /* noop */
        }
      }
      setSaving(false);
      setProgreso("");
    }
  };

  const copiarCredenciales = () => {
    if (!resultado) return;
    navigator.clipboard?.writeText(
      `Correo: ${resultado.correo}\nContraseña: ${resultado.password}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Registrar conductor</h2>
              <p className="text-xs text-gray-500">
                Alta manual con subida de documentos
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
          {resultado ? (
            // ===== Pantalla de éxito con credenciales =====
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Conductor registrado
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Comparte estas credenciales con la conductora. Se aconseja que
                cambie la contraseña al primer ingreso.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Correo</span>
                  <span className="font-medium text-gray-800">{resultado.correo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Contraseña</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {resultado.password}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                {resultado.emailSent ? (
                  <span className="text-green-600">
                    Correo de bienvenida enviado.
                  </span>
                ) : (
                  <span className="text-amber-600">
                    Correo aún no enviado (falta configurar el SMTP). Por ahora
                    comparte las credenciales manualmente.
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={copiarCredenciales}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
                >
                  {copiado ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar credenciales
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            // ===== Formulario =====
            <form id="form-registrar-conductor" onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Datos personales */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Datos de la conductora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nombre completo" required>
                    <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
                  </Field>
                  <Field label="Correo electrónico" required>
                    <input type="email" className={inputCls} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
                  </Field>
                  <Field label="Teléfono">
                    <div className="flex gap-2">
                      <input className={`${inputCls} w-20`} value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} />
                      <input className={inputCls} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="70000000" />
                    </div>
                  </Field>
                  <Field label="Carné de identidad (CI)">
                    <input className={inputCls} value={ci} onChange={(e) => setCi(e.target.value)} placeholder="0000000" />
                  </Field>
                  <Field label="Género">
                    <select className={inputCls} value={genero} onChange={(e) => setGenero(e.target.value)}>
                      <option>Femenino</option>
                      <option>Masculino</option>
                      <option>Otro</option>
                    </select>
                  </Field>
                  <Field label="Departamento">
                    <select className={inputCls} value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
                      <option value="">Selecciona...</option>
                      {DEPARTAMENTOS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {/* Vehículo */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Vehículo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Marca"><input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} /></Field>
                  <Field label="Modelo"><input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} /></Field>
                  <Field label="Color"><input className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} /></Field>
                  <Field label="Placa"><input className={inputCls} value={placa} onChange={(e) => setPlaca(e.target.value)} /></Field>
                  <Field label="Tipo"><input className={inputCls} value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} placeholder="Auto, Vagoneta..." /></Field>
                  <Field label="N° asientos"><input className={inputCls} value={numeroAsientos} onChange={(e) => setNumeroAsientos(e.target.value)} placeholder="4" /></Field>
                  <Field label="Servicio" required>
                    <select
                      className={inputCls}
                      value={servicioSel}
                      onChange={(e) => setServicioSel(e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      {servicios.map((s) => (
                        <option key={s.id} value={s.nombre}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {/* Documentos */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Foto de perfil
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <UploadImagen label="Foto de perfil" file={fotoPerfil} onChange={setFotoPerfil} />
                </div>

                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Documentos obligatorios
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {DOCS_OBLIGATORIOS.map((d) => (
                    <UploadImagen key={d.id} label={d.label} required file={docs[d.id] || null} onChange={(f) => setDoc_(d.id, f)} />
                  ))}
                </div>

                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Documentos opcionales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DOCS_OPCIONALES.map((d) => (
                    <UploadImagen key={d.id} label={d.label} file={docs[d.id] || null} onChange={(f) => setDoc_(d.id, f)} />
                  ))}
                </div>
              </section>

              {/* Opciones */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} className="rounded" />
                Habilitar a la conductora inmediatamente (marca documentos como verificados)
              </label>

              <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <span>
                  Se creará una cuenta de acceso con contraseña autogenerada. Tu
                  sesión de administrador no se cierra.
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!resultado && (
          <div className="flex items-center justify-between gap-3 p-5 border-t">
            <span className="text-xs text-gray-500">{progreso}</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                type="submit"
                form="form-registrar-conductor"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Registrar conductor
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default RegistrarConductorModal;
