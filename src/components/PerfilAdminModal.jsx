import { useState, useEffect } from "react";
import { db, storage, auth } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  X,
  Camera,
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
} from "lucide-react";

export function PerfilAdminModal({ onClose }) {
  const user = auth.currentUser;
  const [nombre, setNombre] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState("");
  // El telefono NO existia en `administradores`: lo pidio la [1743] y se
  // guarda en el mismo documento, junto al nombre y la foto.
  const [telefono, setTelefono] = useState("");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null); // {tipo:'ok'|'error', texto}

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "administradores", user.uid));
        const data = snap.exists() ? snap.data() : {};
        setNombre(data.nombre || user.displayName || "");
        setFotoUrl(data.fotoUrl || user.photoURL || "");
        setTelefono(data.telefono || "");
      } catch (e) {
        console.error("Perfil admin:", e);
      }
    })();
  }, [user]);

  const onPickFoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const guardar = async () => {
    if (!user) return;
    setGuardando(true);
    setMsg(null);
    try {
      let nuevaFoto = fotoUrl;

      // 1) Subir foto si se eligió una nueva.
      if (fotoFile) {
        const ext = (fotoFile.name.split(".").pop() || "jpg").toLowerCase();
        const r = storageRef(
          storage,
          `administradores/${user.uid}/foto_${Date.now()}.${ext}`
        );
        await uploadBytes(r, fotoFile);
        nuevaFoto = await getDownloadURL(r);
      }

      // 2) Guardar nombre + foto en Firestore y en el perfil de Auth.
      await setDoc(
        doc(db, "administradores", user.uid),
        {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          fotoUrl: nuevaFoto || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      try {
        await updateProfile(user, {
          displayName: nombre.trim(),
          photoURL: nuevaFoto || null,
        });
      } catch (_) {
        /* no crítico */
      }

      // 3) Cambiar contraseña si se completó.
      if (passNueva.trim()) {
        if (passNueva.trim().length < 6) {
          throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
        }
        try {
          await updatePassword(user, passNueva.trim());
        } catch (e) {
          if (e.code === "auth/requires-recent-login") {
            if (!passActual.trim()) {
              throw new Error(
                "Por seguridad, ingresá tu contraseña actual para cambiarla."
              );
            }
            const cred = EmailAuthProvider.credential(
              user.email,
              passActual.trim()
            );
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, passNueva.trim());
          } else if (e.code === "auth/weak-password") {
            throw new Error("La nueva contraseña es muy débil.");
          } else {
            throw e;
          }
        }
      }

      setFotoUrl(nuevaFoto);
      setFotoFile(null);
      setPassActual("");
      setPassNueva("");
      setMsg({ tipo: "ok", texto: "Perfil actualizado correctamente." });
    } catch (e) {
      console.error("Guardar perfil admin:", e);
      setMsg({
        tipo: "error",
        texto: e.message || "No se pudo guardar el perfil.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const avatar = fotoPreview || fotoUrl;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">Mi perfil</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portada verde + avatar montado encima: el mismo lenguaje visual
            que la ficha de PerfilUsuario, para que se lean como parte del
            mismo sistema. (Tarjeta [1743]) */}
        <div className="h-24 bg-gradient-to-r from-green-400 to-green-500" />

        <div className="px-5 pb-5 space-y-5">
          <div className="flex items-end gap-4 -mt-12 mb-2">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-green-50 border-4 border-white shadow-lg flex items-center justify-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Foto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-green-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 cursor-pointer shadow">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFoto}
                />
              </label>
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-xl font-bold text-gray-800 truncate">
                {nombre || "Sin nombre"}
              </p>
              <p className="text-sm text-gray-500">Administradora</p>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
            />
          </div>

          {/* Contacto: mismas tarjetas grises con ícono verde que la ficha de
              Usuarios. El correo va de sólo lectura porque cambiarlo es una
              operación de la cuenta, no de este formulario. La ubicación que
              sí muestra aquella ficha queda afuera a propósito: la tarjeta
              pide expresamente no incorporarla. */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">
                  Correo Electrónico
                </span>
              </div>
              <p className="text-gray-800 font-medium break-all">
                {user?.email || "No disponible"}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">Teléfono</span>
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Tu número de teléfono"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Cambiar contraseña{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </p>
            <input
              type="password"
              value={passActual}
              onChange={(e) => setPassActual(e.target.value)}
              placeholder="Contraseña actual"
              className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
            />
            <input
              type="password"
              value={passNueva}
              onChange={(e) => setPassNueva(e.target.value)}
              placeholder="Nueva contraseña (mín. 6)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
            />
          </div>

          {msg && (
            <div
              className={`text-sm rounded-lg px-3 py-2 ${
                msg.tipo === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {msg.texto}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end p-5 border-t">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cerrar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold flex items-center gap-2"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PerfilAdminModal;
