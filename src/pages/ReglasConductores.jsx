import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Edit2,
  Trash2,
  Ruler,
  Eye,
  EyeOff,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

const COL = "reglasConductores";

const FORM_VACIO = {
  titulo: "",
  descripcion: "",
  orden: 0,
  activo: true,
  obligatoria: true,
};

export function ReglasConductores() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [expandida, setExpandida] = useState({});
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COL),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const oa = Number(a.orden ?? 0);
          const ob = Number(b.orden ?? 0);
          if (oa !== ob) return oa - ob;
          return (a.titulo || "").localeCompare(b.titulo || "");
        });
        setItems(list);
        setCargando(false);
      },
      (err) => {
        console.error("Error cargando reglas:", err);
        setCargando(false);
      }
    );
    return () => unsub();
  }, []);

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...FORM_VACIO, orden: items.length });
  };

  const abrirEditar = (item) => {
    setEditId(item.id);
    setForm({
      titulo: item.titulo || "",
      descripcion: item.descripcion || "",
      orden: Number(item.orden ?? 0),
      activo: item.activo !== false,
      obligatoria: item.obligatoria !== false,
    });
  };

  const cerrarForm = () => {
    setForm(null);
    setEditId(null);
  };

  const guardar = async () => {
    if (!form.titulo.trim()) {
      alert("El título de la regla es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        orden: Number(form.orden) || 0,
        activo: !!form.activo,
        obligatoria: !!form.obligatoria,
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, COL, editId), payload);
      } else {
        await addDoc(collection(db, COL), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      cerrarForm();
    } catch (e) {
      console.error("Error guardando regla:", e);
      alert("No se pudo guardar: " + e.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (item) => {
    try {
      await updateDoc(doc(db, COL, item.id), {
        activo: !(item.activo !== false),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error cambiando estado:", e);
    }
  };

  const eliminar = async (id) => {
    try {
      await deleteDoc(doc(db, COL, id));
      setConfirmEliminar(null);
    } catch (e) {
      console.error("Error eliminando:", e);
      alert("No se pudo eliminar: " + e.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Ruler className="w-6 h-6 text-green-500" />
            Reglas de conductores
          </h1>
          <p className="text-gray-600 mt-1">
            Catálogo de reglas; cada conductor elige cuáles aplican a su auto
            (ej: No mascotas, Prohibido fumar). Los pasajeros las verán.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow"
        >
          <Plus className="w-5 h-5" />
          Nueva Regla
        </button>
      </div>

      {form && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-green-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {editId ? "Editar regla" : "Nueva regla"}
            </h2>
            <button onClick={cerrarForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Título de la regla
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Mantener el vehículo limpio"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                placeholder="Detalle de la regla..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.obligatoria}
                    onChange={(e) => setForm({ ...form, obligatoria: e.target.checked })}
                  />
                  Obligatoria (debe aceptarse)
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  Visible en la app
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={cerrarForm}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="text-gray-600 mt-4">Cargando reglas...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm">
          <Ruler className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Aún no hay reglas
          </h3>
          <p className="text-gray-500 mb-4">
            Crea la primera regla que aceptarán los conductores
          </p>
          <button
            onClick={abrirCrear}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Crear Regla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const abierta = !!expandida[item.id];
            const visible = item.activo !== false;
            const obligatoria = item.obligatoria !== false;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border ${
                  visible ? "border-gray-100" : "border-gray-200 opacity-70"
                }`}
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {obligatoria ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Obligatoria
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          Opcional
                        </span>
                      )}
                      <span className="text-xs text-gray-400">orden: {item.orden ?? 0}</span>
                      {!visible && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          Oculta
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-800 mt-1">{item.titulo}</h3>
                    {item.descripcion && (
                      <>
                        {abierta && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                            {item.descripcion}
                          </p>
                        )}
                        <button
                          onClick={() => setExpandida((p) => ({ ...p, [item.id]: !abierta }))}
                          className="flex items-center gap-1 text-xs text-gray-500 mt-1 hover:text-gray-700"
                        >
                          {abierta ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {abierta ? "Ocultar" : "Ver descripción"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActivo(item)}
                      title={visible ? "Ocultar de la app" : "Mostrar en la app"}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => abrirEditar(item)}
                      title="Editar"
                      className="p-2 rounded-lg hover:bg-gray-100 text-blue-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmEliminar(item)}
                      title="Eliminar"
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Eliminar regla</h3>
            <p className="text-sm text-gray-600 mb-5">
              ¿Seguro que querés eliminar «{confirmEliminar.titulo}»? Esta acción no se
              puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmEliminar(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmEliminar.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReglasConductores;
