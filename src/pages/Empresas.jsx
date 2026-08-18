import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  FileText,
  Power,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarClock,
  UserCog,
} from "lucide-react";
import { db } from "../config/firebase";
import FilterChips from "../components/FilterChips";
import DeleteAlert from "../components/DeleteAlert";
import { formatFecha } from "../utils/fechas";
import { AgregarEmpresaModal } from "../modal/AgregarEmpresaModal";
import { FacturacionEmpresaModal } from "../modal/FacturacionEmpresaModal";
import { AsignarContactoEmpresaModal } from "../modal/AsignarContactoEmpresaModal";

const CICLO_LABEL = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [cicloFilter, setCicloFilter] = useState("todos");

  const [showCrear, setShowCrear] = useState(false);
  const [empresaFacturar, setEmpresaFacturar] = useState(null);
  const [empresaContacto, setEmpresaContacto] = useState(null);
  const [empresaEliminar, setEmpresaEliminar] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "empresas"),
      where("tipo", "==", "cliente")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setEmpresas(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando empresas:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const activas = empresas.filter((e) => e.activa !== false).length;

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return empresas.filter((e) => {
      const matchTexto =
        !t ||
        (e.nombre || "").toLowerCase().includes(t) ||
        (e.nit || "").toLowerCase().includes(t) ||
        (e.contactoPrincipalNombre || "").toLowerCase().includes(t) ||
        (e.contactoPrincipalEmail || "").toLowerCase().includes(t);
      const matchEstado =
        estadoFilter === "todos" ||
        (estadoFilter === "activas" && e.activa !== false) ||
        (estadoFilter === "inactivas" && e.activa === false);
      const matchCiclo =
        cicloFilter === "todos" || e.cicloFacturacion === cicloFilter;
      return matchTexto && matchEstado && matchCiclo;
    });
  }, [empresas, busqueda, estadoFilter, cicloFilter]);

  const toggleActiva = async (empresa) => {
    setTogglingId(empresa.id);
    try {
      const functions = getFunctions(undefined, "us-central1");
      const fn = httpsCallable(functions, "actualizarEmpresa");
      await fn({ empresaId: empresa.id, activa: empresa.activa === false });
    } catch (e) {
      console.error("Error cambiando estado:", e);
      alert(e?.message || "No se pudo cambiar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEliminar = async () => {
    if (!empresaEliminar) return;
    setIsDeleting(true);
    try {
      const functions = getFunctions(undefined, "us-central1");
      const fn = httpsCallable(functions, "eliminarEmpresa");
      await fn({ empresaId: empresaEliminar.id });
      setEmpresaEliminar(null);
    } catch (e) {
      console.error("Error eliminando:", e);
      alert(e?.message || "No se pudo eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1>Empresas</h1>
          <p className="text-sm text-gray-500">
            Cuentas corporativas con facturación a fin de periodo
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Panel de Control {">"} Empresas
        </div>
      </div>

      {/* Stats + acción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl leading-none">{empresas.length}</div>
            <div className="text-sm text-gray-500">Empresas</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl leading-none">{activas}</div>
            <div className="text-sm text-gray-500">Activas</div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-end">
          <button
            onClick={() => setShowCrear(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/30 hover:from-green-600 hover:to-green-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva empresa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
          <FilterChips
            label="Estado"
            value={estadoFilter}
            onChange={setEstadoFilter}
            options={[
              { value: "todos", label: "Todas", icon: Building2, tone: "slate" },
              {
                value: "activas",
                label: "Activas",
                icon: CheckCircle2,
                count: activas,
                tone: "green",
              },
              {
                value: "inactivas",
                label: "Inactivas",
                icon: XCircle,
                count: empresas.length - activas,
                tone: "red",
              },
            ]}
          />
          <FilterChips
            label="Ciclo"
            value={cicloFilter}
            onChange={setCicloFilter}
            options={[
              { value: "todos", label: "Todos", icon: CalendarClock, tone: "slate" },
              { value: "semanal", label: "Semanal", tone: "blue" },
              { value: "quincenal", label: "Quincenal", tone: "amber" },
              { value: "mensual", label: "Mensual", tone: "green" },
            ]}
          />
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empresa, NIT o contacto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition w-full sm:w-72"
            />
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando empresas...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            No hay empresas que coincidan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Empresa</th>
                  <th className="text-left py-3 px-4">NIT</th>
                  <th className="text-left py-3 px-4">Contacto principal</th>
                  <th className="text-left py-3 px-4">Ciclo</th>
                  <th className="text-left py-3 px-4">Estado</th>
                  <th className="text-left py-3 px-4">Creada</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {e.logoUrl ? (
                          <img
                            src={e.logoUrl}
                            alt={e.nombre}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold">
                            {(e.nombre || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">
                            {e.nombre}
                          </div>
                          <div className="text-xs text-gray-400">
                            {e.razonSocial}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {e.nit || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {e.contactoPrincipalUid ? (
                        <>
                          <div className="text-sm text-gray-800">
                            {e.contactoPrincipalNombre || "—"}
                          </div>
                          <div className="text-xs text-green-700">
                            {e.contactoPrincipalEmail}
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => setEmpresaContacto(e)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                          <UserCog className="w-3.5 h-3.5" /> Asignar contacto
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-gray-100 text-gray-600 px-2.5 py-1 text-xs font-semibold">
                        {CICLO_LABEL[e.cicloFacturacion] || "Mensual"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {e.activa === false ? (
                        <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 text-xs font-semibold">
                          Inactiva
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                          Activa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatFecha(e.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEmpresaFacturar(e)}
                          className="text-green-600 hover:text-green-700 p-2 rounded-full hover:bg-green-50 transition"
                          title="Facturación"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEmpresaContacto(e)}
                          className="text-blue-600 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition"
                          title="Asignar / cambiar contacto principal"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActiva(e)}
                          disabled={togglingId === e.id}
                          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
                          title={e.activa === false ? "Activar" : "Desactivar"}
                        >
                          {togglingId === e.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEmpresaEliminar(e)}
                          className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
                          title="Eliminar"
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

      {showCrear && (
        <AgregarEmpresaModal onClose={() => setShowCrear(false)} />
      )}

      {empresaFacturar && (
        <FacturacionEmpresaModal
          empresa={empresaFacturar}
          onClose={() => setEmpresaFacturar(null)}
        />
      )}

      {empresaContacto && (
        <AsignarContactoEmpresaModal
          empresa={empresaContacto}
          onClose={() => setEmpresaContacto(null)}
        />
      )}

      {empresaEliminar && (
        <DeleteAlert
          isOpen={!!empresaEliminar}
          onClose={() => setEmpresaEliminar(null)}
          onConfirm={handleEliminar}
          itemName={empresaEliminar.nombre}
          itemType="la empresa"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default Empresas;
