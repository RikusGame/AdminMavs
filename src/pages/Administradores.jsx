import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ShieldCheck,
  Trash2,
  UserPlus,
  Mail,
  User as UserIcon,
  Loader2,
  X,
  Info,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { getAllAdmins, removeAdmin } from "../utils/adminManagement";
import { formatFecha } from "../utils/fechas";
import DeleteAlert from "../components/DeleteAlert";
import { SECCIONES_ADMIN } from "../config/seccionesAdmin";
import { ADMIN_EMAILS } from "../utils/adminValidator";

export function Administradores() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Resultado del alta: { correo, emailSent, yaExistia, requiereReset }
  const [credenciales, setCredenciales] = useState(null);

  const [adminToDelete, setAdminToDelete] = useState(null);
  const [permisosAdmin, setPermisosAdmin] = useState(null); // admin en edición
  const [permisosSel, setPermisosSel] = useState([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  const esSuperAdmin = (a) => ADMIN_EMAILS.includes(a?.email);

  const abrirPermisos = (a) => {
    setPermisosAdmin(a);
    // Si no tiene permisos definidos → arranca con TODO marcado (acceso total).
    const actuales = Array.isArray(a.permisos)
      ? a.permisos
      : SECCIONES_ADMIN.map((s) => s.id);
    setPermisosSel(actuales);
  };

  const togglePermiso = (id) => {
    setPermisosSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const guardarPermisos = async () => {
    if (!permisosAdmin) return;
    setGuardandoPermisos(true);
    try {
      await updateDoc(doc(db, "administradores", permisosAdmin.uid), {
        permisos: permisosSel,
        permisosAt: serverTimestamp(),
      });
      setAdmins((prev) =>
        prev.map((x) =>
          x.uid === permisosAdmin.uid ? { ...x, permisos: permisosSel } : x
        )
      );
      setPermisosAdmin(null);
    } catch (e) {
      console.error("Error guardando permisos:", e);
      alert("No se pudo guardar: " + e.message);
    } finally {
      setGuardandoPermisos(false);
    }
  };
  const [isDeleting, setIsDeleting] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const data = await getAllAdmins();
    setAdmins(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Ingresa un correo válido.");
      return;
    }

    setSaving(true);
    try {
      // La Cloud Function crea o convierte la cuenta existente en admin,
      // define la contraseña y envía el correo (todo del lado servidor).
      const functions = getFunctions(undefined, "us-central1");
      const fn = httpsCallable(functions, "crearAdmin");
      const res = await fn({ email: email.trim(), nombre: nombre.trim() });
      const data = res.data || {};

      // La contraseña ya NO viaja al panel: se envía por correo (o un link de
      // reseteo para cuentas existentes). Solo mostramos el resultado. (Tarjeta [200])
      setCredenciales({
        correo: data.correo,
        emailSent: data.emailSent,
        yaExistia: data.yaExistia,
        requiereReset: data.requiereReset,
      });
      setNombre("");
      setEmail("");
      setShowForm(false);
      await cargar();
    } catch (err) {
      let msg = err?.message || String(err);
      if (err?.code === "functions/permission-denied") {
        msg = "No tienes permiso para agregar administradores.";
      } else if (err?.code === "functions/invalid-argument") {
        msg = "El correo no es válido.";
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    await removeAdmin(adminToDelete.uid);
    setAdminToDelete(null);
    setIsDeleting(false);
    await cargar();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1>Administradores</h1>
          <p className="text-sm text-gray-500">
            Gestiona quién tiene acceso al panel administrativo
          </p>
        </div>
        <div className="text-sm text-gray-500">Panel de Control {">"} Administradores</div>
      </div>

      {/* Stats + acción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl leading-none">{admins.length}</div>
            <div className="text-sm text-gray-500">Administradores</div>
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>
              Se genera la contraseña y se envía por correo. Si el correo ya
              pertenece a un usuario, se le otorga el rol admin a esa misma
              cuenta. Tu sesión no se cierra.
            </span>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/30 hover:from-green-600 hover:to-green-700 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            {showForm ? "Cerrar" : "Agregar administrador"}
          </button>
        </div>
      </div>

      {/* Credenciales generadas */}
      {credenciales && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-green-800 font-semibold">
              <Check className="w-5 h-5" />
              {credenciales.yaExistia
                ? "Acceso de administrador otorgado"
                : "Administrador creado"}
            </div>
            <button
              onClick={() => setCredenciales(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            {credenciales.requiereReset
              ? "El correo ya tenía una cuenta de usuaria; ahora también es administradora. Le enviamos un enlace para que defina su contraseña del panel (por seguridad, no vemos su contraseña)."
              : "Le enviamos por correo sus credenciales de acceso al panel."}
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Correo</span>
              <span className="font-medium text-gray-800">{credenciales.correo}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            {credenciales.emailSent ? (
              <span className="text-green-600">
                {credenciales.requiereReset
                  ? "Enlace enviado por correo"
                  : "Credenciales enviadas por correo"}
              </span>
            ) : (
              <span className="text-amber-600">
                Correo no enviado — pedile que entre con “¿Olvidaste tu
                contraseña?” en el login del panel
              </span>
            )}
          </div>
        </div>
      )}

      {/* Formulario de alta */}
      {showForm && (
        <div className="bg-white rounded-lg p-5 shadow-sm mb-6 border border-green-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Nuevo administrador</h2>
            <button
              onClick={() => setShowForm(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <div className="relative mt-1">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del admin"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Correo</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                La contraseña se genera automáticamente y se envía al correo.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/30 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Crear administrador
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando administradores...
          </div>
        ) : admins.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            No hay administradores registrados en la colección{" "}
            <code className="bg-gray-100 px-1 rounded">administradores</code>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Administrador</th>
                  <th className="text-left py-3 px-4">Correo</th>
                  <th className="text-left py-3 px-4">Rol</th>
                  <th className="text-left py-3 px-4">Estado</th>
                  <th className="text-left py-3 px-4">Creado</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adminItem) => (
                  <tr key={adminItem.uid} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                          {(adminItem.nombre || adminItem.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium">{adminItem.nombre || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-green-700">{adminItem.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {adminItem.rol || "admin"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {adminItem.activo === false ? (
                        <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 text-xs font-semibold">
                          Inactivo
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatFecha(adminItem.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {esSuperAdmin(adminItem) ? (
                          <span className="text-xs text-gray-400 px-2">
                            Acceso total
                          </span>
                        ) : (
                          <button
                            onClick={() => abrirPermisos(adminItem)}
                            className="text-green-600 hover:text-green-700 p-2 rounded-full hover:bg-green-50 transition"
                            title="Niveles de acceso"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setAdminToDelete(adminItem)}
                          className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
                          title="Quitar acceso de administrador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adminToDelete && (
        <DeleteAlert
          isOpen={!!adminToDelete}
          onClose={() => setAdminToDelete(null)}
          onConfirm={handleRemove}
          itemName={adminToDelete.nombre || adminToDelete.email}
          itemType="el acceso de administrador de"
          isDeleting={isDeleting}
        />
      )}

      {/* Modal: niveles de acceso (checklist de secciones) */}
      {permisosAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-green-500" />
                  Niveles de acceso
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {permisosAdmin.nombre || permisosAdmin.email}
                </p>
              </div>
              <button
                onClick={() => setPermisosAdmin(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-2 flex items-center justify-between border-b">
              <span className="text-xs text-gray-500">
                {permisosSel.length}/{SECCIONES_ADMIN.length} secciones
              </span>
              <button
                onClick={() =>
                  setPermisosSel(
                    permisosSel.length === SECCIONES_ADMIN.length
                      ? []
                      : SECCIONES_ADMIN.map((s) => s.id)
                  )
                }
                className="text-xs font-semibold text-green-600 hover:text-green-700"
              >
                {permisosSel.length === SECCIONES_ADMIN.length
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {SECCIONES_ADMIN.map((s) => {
                const marcada = permisosSel.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => togglePermiso(s.id)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-sm text-gray-800">{s.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end p-5 border-t">
              <button
                onClick={() => setPermisosAdmin(null)}
                disabled={guardandoPermisos}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPermisos}
                disabled={guardandoPermisos}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold"
              >
                {guardandoPermisos ? "Guardando..." : "Guardar acceso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Administradores;
