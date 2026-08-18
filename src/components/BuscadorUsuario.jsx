import { useState, useEffect, useMemo } from "react";
import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Search, X, User } from "lucide-react";

/**
 * Buscador/autocompletado de usuarios (pasajeros + conductores).
 * Permite escribir nombre, apellido, correo o uid y elegir; devuelve el uid
 * vía onSelect(uid, label). Reemplaza el input crudo de UID.
 */
export function BuscadorUsuario({ onSelect }) {
  const [usuarios, setUsuarios] = useState([]);
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const out = [];
        const pas = await getDocs(collection(db, "pasajeros"));
        pas.forEach((d) => {
          const data = d.data() || {};
          const p = data.perfil || {};
          const nombre =
            p.name || p.nombre || data.displayName || data.nombre || "";
          const email = p.email || data.email || "";
          if (nombre || email)
            out.push({ uid: d.id, nombre, email, rol: "pasajero" });
        });
        const tax = await getDocs(collection(db, "taxistas"));
        tax.forEach((d) => {
          const data = d.data() || {};
          const perfil = data.perfilTaxista || {};
          const nombre = perfil.nombre || data.nombre || "";
          const email = perfil.correo || perfil.email || data.email || "";
          if (nombre || email)
            out.push({ uid: d.id, nombre, email, rol: "conductor" });
        });
        setUsuarios(out);
      } catch (e) {
        console.error("BuscadorUsuario:", e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return usuarios
      .filter(
        (u) =>
          u.nombre.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t) ||
          u.uid.toLowerCase().includes(t)
      )
      .slice(0, 8);
  }, [q, usuarios]);

  const elegir = (u) => {
    setSel(u);
    setQ("");
    setAbierto(false);
    onSelect(u.uid, `${u.nombre} (${u.rol})`);
  };

  const limpiar = () => {
    setSel(null);
    onSelect("", "");
  };

  return (
    <div className="relative">
      <label className="text-xs font-medium text-gray-600">
        Usuario destino
      </label>
      {sel ? (
        <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 border rounded-lg bg-green-50 border-green-200">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {sel.nombre || sel.uid}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {sel.email} · {sel.rol}
            </div>
          </div>
          <button
            type="button"
            onClick={limpiar}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Cambiar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              placeholder={
                cargando
                  ? "Cargando usuarios..."
                  : "Buscar por nombre, apellido o correo"
              }
            />
          </div>
          {abierto && resultados.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {resultados.map((u) => (
                <button
                  key={u.uid + u.rol}
                  type="button"
                  onClick={() => elegir(u)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {u.nombre || "(sin nombre)"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {u.email} · {u.rol}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {abierto && q.trim() && resultados.length === 0 && !cargando && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-500">
              Sin coincidencias
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BuscadorUsuario;
