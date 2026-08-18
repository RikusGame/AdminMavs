import { useState, useEffect, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { X, Loader2, UserCheck, Search, Check } from "lucide-react";

/**
 * Modal para asignar o cambiar el contacto principal de una empresa.
 * Llama al callable `asignarContactoEmpresa`. El contacto anterior pasa a
 * ser miembro normal.
 */
export function AsignarContactoEmpresaModal({ empresa, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [contacto, setContacto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

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

  const handleSubmit = async () => {
    if (!contacto) return setError("Selecciona un usuario.");
    setError("");
    setSaving(true);
    try {
      const functions = getFunctions(undefined, "us-central1");
      const fn = httpsCallable(functions, "asignarContactoEmpresa");
      await fn({ empresaId: empresa.id, contactoEmail: contacto.email });
      setOk(true);
    } catch (err) {
      let msg = err?.message || String(err);
      if (err?.code === "functions/not-found") {
        msg = "Ese usuario no tiene cuenta en la app.";
      } else if (err?.code === "functions/permission-denied") {
        msg = "No tienes permiso.";
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Contacto principal
              </h2>
              <p className="text-xs text-gray-500">{empresa.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          {ok ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Contacto asignado
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                <strong>{contacto?.nombre}</strong> es ahora el contacto
                principal y verá el menú <em>“Mi empresa”</em> en su app.
              </p>
              <button
                onClick={onClose}
                className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition"
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {empresa.contactoPrincipalNombre && (
                <p className="text-sm text-gray-500 mb-3">
                  Actual:{" "}
                  <strong className="text-gray-700">
                    {empresa.contactoPrincipalNombre}
                  </strong>{" "}
                  ({empresa.contactoPrincipalEmail}). Al cambiarlo, pasará a ser
                  miembro normal.
                </p>
              )}

              {contacto ? (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-800">
                      {contacto.nombre}
                    </div>
                    <div className="text-sm text-gray-500">{contacto.email}</div>
                  </div>
                  <button
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar usuario por nombre o correo..."
                    />
                  </div>
                  {busqueda.trim() && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y">
                      {resultados.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-gray-500">
                          Sin resultados.
                        </div>
                      ) : (
                        resultados.map((u) => (
                          <button
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
            </>
          )}
        </div>

        {!ok && (
          <div className="flex items-center justify-end gap-3 p-5 border-t">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !contacto}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Asignando...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Asignar contacto
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AsignarContactoEmpresaModal;
