import { useState, useEffect, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase";
import {
  X,
  Loader2,
  Building2,
  Check,
  Search,
  UserCheck,
} from "lucide-react";
import { UploadImagen } from "../components/UploadImagen";

const CIUDADES = [
  "La Paz",
  "El Alto",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Sucre",
  "Tarija",
  "Trinidad",
  "Cobija",
];

/**
 * Modal para crear una empresa cliente (cuenta corporativa) y asignar
 * su contacto principal (un usuario que YA debe existir en la app).
 * La creación se hace vía Cloud Function `crearEmpresa` (Admin SDK), que
 * escribe la empresa, el miembro contacto y marca al usuario.
 */
export function AgregarEmpresaModal({ onClose, onCreada }) {
  // Datos de la empresa
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [emailFacturacion, setEmailFacturacion] = useState("");
  const [cicloFacturacion, setCicloFacturacion] = useState("mensual");
  const [aprobacionPorCarrera, setAprobacionPorCarrera] = useState(true);
  const [logo, setLogo] = useState(null);

  // Contacto principal
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [contacto, setContacto] = useState(null);

  const [saving, setSaving] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  // Cargar usuarios (pasajeros) para el selector de contacto principal.
  useEffect(() => {
    const q = query(collection(db, "pasajeros"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const perfil = data.perfil || {};
          return {
            uid: d.id,
            nombre: perfil.name || perfil.nombre || "",
            email: perfil.email || "",
            photoUrl: perfil.photoUrl || "",
          };
        })
        .filter((u) => u.nombre && u.email);
      setUsuarios(list);
    });
    return () => unsub();
  }, []);

  const resultados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return [];
    return usuarios
      .filter(
        (u) =>
          u.nombre.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t)
      )
      .slice(0, 6);
  }, [busqueda, usuarios]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) return setError("El nombre de la empresa es obligatorio.");

    setSaving(true);
    try {
      // Subir logo (opcional) — se guarda en Storage con un id temporal.
      let logoUrl = "";
      if (logo) {
        setProgreso("Subiendo logo...");
        const stamp = `${nit.trim()}_${nombre.trim().replace(/\s+/g, "_")}`;
        const r = ref(storage, `empresas/logos/${stamp}.jpg`);
        await uploadBytes(r, logo);
        logoUrl = await getDownloadURL(r);
      }

      setProgreso("Creando empresa...");
      const functions = getFunctions(undefined, "us-central1");
      const fn = httpsCallable(functions, "crearEmpresa");
      await fn({
        nombre: nombre.trim(),
        razonSocial: razonSocial.trim(),
        nit: nit.trim(),
        direccion: direccion.trim(),
        ciudad,
        telefono: telefono.trim(),
        emailFacturacion: emailFacturacion.trim(),
        cicloFacturacion,
        aprobacionPorCarrera,
        logoUrl,
        contactoEmail: contacto?.email || "",
      });

      setOk(true);
      onCreada?.();
    } catch (err) {
      let msg = err?.message || String(err);
      if (err?.code === "functions/not-found") {
        msg =
          "El contacto principal no tiene cuenta en la app. Debe registrarse primero.";
      } else if (err?.code === "functions/permission-denied") {
        msg = "No tienes permiso para crear empresas.";
      }
      setError(msg);
    } finally {
      setSaving(false);
      setProgreso("");
    }
  };

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
              <h2 className="font-semibold text-gray-800">Nueva empresa</h2>
              <p className="text-xs text-gray-500">
                Cuenta corporativa con facturación a fin de periodo
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
          {ok ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Empresa creada</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
                {contacto ? (
                  <>
                    <strong>{contacto.nombre}</strong> es ahora el contacto
                    principal. En su app verá el menú <em>“Mi empresa”</em>{" "}
                    para agregar miembros.
                  </>
                ) : (
                  <>
                    La empresa se creó sin contacto principal. Podés asignarlo
                    más adelante.
                  </>
                )}
              </p>
              <button
                onClick={onClose}
                className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition"
              >
                Listo
              </button>
            </div>
          ) : (
            <form
              id="form-agregar-empresa"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Datos fiscales */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Datos de la empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nombre comercial" required>
                    <input
                      className={inputCls}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Constructora XYZ"
                    />
                  </Field>
                  <Field label="Razón social">
                    <input
                      className={inputCls}
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      placeholder="Razón social para factura"
                    />
                  </Field>
                  <Field label="NIT">
                    <input
                      className={inputCls}
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="1234567890"
                    />
                  </Field>
                  <Field label="Ciudad">
                    <select
                      className={inputCls}
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      {CIUDADES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dirección">
                    <input
                      className={inputCls}
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Av. / calle, número"
                    />
                  </Field>
                  <Field label="Teléfono">
                    <input
                      className={inputCls}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="700..."
                    />
                  </Field>
                  <Field label="Email de facturación">
                    <input
                      type="email"
                      className={inputCls}
                      value={emailFacturacion}
                      onChange={(e) => setEmailFacturacion(e.target.value)}
                      placeholder="facturacion@empresa.com"
                    />
                  </Field>
                  <Field label="Ciclo de facturación">
                    <select
                      className={inputCls}
                      value={cicloFacturacion}
                      onChange={(e) => setCicloFacturacion(e.target.value)}
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  <UploadImagen
                    label="Logo (opcional)"
                    file={logo}
                    onChange={setLogo}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
                  <input
                    type="checkbox"
                    checked={aprobacionPorCarrera}
                    onChange={(e) => setAprobacionPorCarrera(e.target.checked)}
                    className="rounded"
                  />
                  Requerir aprobación del contacto principal por cada carrera
                </label>
              </section>

              {/* Contacto principal */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Contacto principal <span className="normal-case text-gray-300">(opcional)</span>
                </h3>

                {contacto ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {contacto.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contacto.email}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContacto(null)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        className={`${inputCls} pl-10`}
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar usuario por nombre o correo..."
                      />
                    </div>
                    {busqueda.trim() && (
                      <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y">
                        {resultados.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-500">
                            Sin resultados. El contacto debe tener cuenta en la
                            app.
                          </div>
                        ) : (
                          resultados.map((u) => (
                            <button
                              type="button"
                              key={u.uid}
                              onClick={() => {
                                setContacto(u);
                                setBusqueda("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                            >
                              <div className="font-medium text-gray-800">
                                {u.nombre}
                              </div>
                              <div className="text-sm text-gray-500">
                                {u.email}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </form>
          )}
        </div>

        {/* Footer */}
        {!ok && (
          <div className="flex items-center justify-between gap-3 p-5 border-t">
            <span className="text-xs text-gray-500">{progreso}</span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-agregar-empresa"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creando...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" /> Crear empresa
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

export default AgregarEmpresaModal;
