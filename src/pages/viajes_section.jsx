import { useState, useEffect, useMemo } from "react";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { MapPin, User, CreditCard, Mail } from "lucide-react";

export default function ViajesSection() {
  const [viajes, setViajes] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipoViaje, setFiltroTipoViaje] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [busquedaConductor, setBusquedaConductor] = useState("");

  useEffect(() => {
    setLoadingViajes(true);

    const ordenesQuery = query(
      collectionGroup(db, "ordenes"),
      orderBy("createdAt", "desc"),
      limit(300)
    );

    const unsubscribe = onSnapshot(
      ordenesQuery,
      async (snapshot) => {
        try {
          const viajesBase = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const origen = data.origen || {};
            const destino = data.destino || {};
            const tarifa = data.tarifa || {};

            let nombreServicio = "Normal";
            if (data.servicio && typeof data.servicio === "string") {
              nombreServicio = data.servicio;
            } else if (data.tipo && typeof data.tipo === "string") {
              nombreServicio =
                data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1);
            }

            const nombreTaxistaDesdeOrden =
              data.nombreTaxista ||
              data.taxistaNombre ||
              data.conductorNombre ||
              data.nombreConductor ||
              "";

            const uidTaxista = data.uidTaxista || data.idTaxista || null;

            const tipoViajeRaw =
              data.tipoViaje ??
              data.tipo_viaje ??
              data.tipo_servicio ??
              data.subtipo ??
              null;

            const esProgramado =
              data.programado === true ||
              data.esProgramado === true ||
              String(tipoViajeRaw || "").toLowerCase() === "programado";

            const tipoViaje = esProgramado ? "programado" : "normal";

            const categoriaRaw =
              data.categoriaServicio ??
              data.categoria ??
              data.clienteTipo ??
              data.tipoCliente ??
              null;

            const esEmpresa =
              data.esEmpresa === true ||
              String(categoriaRaw || "").toLowerCase() === "empresa" ||
              String(categoriaRaw || "").toLowerCase() === "empresas";

            const categoriaViaje = esEmpresa ? "empresa" : "normal";

            return {
              id: docSnap.id,
              ordenId: data.ordenId || docSnap.id,
              uidTaxista,
              conductorNombre: nombreTaxistaDesdeOrden,
              uidPasajero: data.uidPasajero || data.idPasajero || "N/A",
              origen:
                origen.texto ||
                origen.calle ||
                origen.direccion ||
                "Origen no disponible",
              destino:
                destino.texto ||
                destino.calle ||
                destino.direccion ||
                "Destino no disponible",
              fecha: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date(),
              estado: data.estado || "pendiente",
              metodoPago: data.metodoPago || "efectivo",
              total: Number(tarifa.total || data.total || 0),
              km: Number(tarifa.km || data.km || 0),
              servicio: nombreServicio,
              estadoPago: data.estadoPago || "pendiente",
              tipoViaje,
              categoriaViaje,
            };
          });

          const idsUnicos = [
            ...new Set(
              viajesBase
                .map((v) => v.uidTaxista)
                .filter((id) => typeof id === "string" && id.trim() !== "")
            ),
          ];

          const cacheConductores = {};

          await Promise.all(
            idsUnicos.map(async (taxistaId) => {
              try {
                const taxistaRef = doc(db, "taxistas", taxistaId);
                const taxistaSnap = await getDoc(taxistaRef);

                if (taxistaSnap.exists()) {
                  const taxistaData = taxistaSnap.data();
                  const perfil = taxistaData.perfilTaxista || {};

                  cacheConductores[taxistaId] = {
                    nombre:
                      perfil.nombre ||
                      taxistaData.nombre ||
                      taxistaData.displayName ||
                      "",
                    telefono:
                      perfil.telefono ||
                      taxistaData.telefono ||
                      taxistaData.celular ||
                      "N/A",
                    correo:
                      perfil.correo ||
                      perfil.email ||
                      perfil.gmail ||
                      perfil.emailAddress ||
                      taxistaData.correo ||
                      taxistaData.email ||
                      taxistaData.mail ||
                      taxistaData.userEmail ||
                      taxistaData.correoElectronico ||
                      taxistaData.emailAddress ||
                      "Correo no disponible",
                  };
                } else {
                  cacheConductores[taxistaId] = {
                    nombre: "",
                    telefono: "N/A",
                    correo: "Correo no disponible",
                  };
                }
              } catch (error) {
                console.error("Error obteniendo conductor:", taxistaId, error);
                cacheConductores[taxistaId] = {
                  nombre: "",
                  telefono: "N/A",
                  correo: "Correo no disponible",
                };
              }
            })
          );

          const viajesFinales = viajesBase.map((viaje) => {
            const infoConductor = viaje.uidTaxista
              ? cacheConductores[viaje.uidTaxista]
              : null;

            const nombreFinal =
              viaje.conductorNombre ||
              infoConductor?.nombre ||
              "Sin conductor asignado";

            return {
              ...viaje,
              conductorNombre: nombreFinal,
              conductorTelefono: infoConductor?.telefono || "N/A",
              conductorCorreo: infoConductor?.correo || "Correo no disponible",
            };
          });

          setViajes(viajesFinales);
        } catch (error) {
          console.error("Error procesando viajes:", error);
        } finally {
          setLoadingViajes(false);
        }
      },
      (error) => {
        console.error("Error al cargar viajes:", error);
        setLoadingViajes(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const viajesFiltrados = useMemo(() => {
    return viajes.filter((v) => {
      const cumpleEstado =
        filtroEstado === "todos" ||
        (v.estado || "").toLowerCase() === filtroEstado.toLowerCase();

      const cumpleTipoViaje =
        filtroTipoViaje === "todos" ||
        (v.tipoViaje || "").toLowerCase() === filtroTipoViaje.toLowerCase();

      const cumpleCategoria =
        filtroCategoria === "todos" ||
        (v.categoriaViaje || "").toLowerCase() === filtroCategoria.toLowerCase();

      const nombreConductor = (v.conductorNombre || "").toLowerCase();
      const correoConductor = (v.conductorCorreo || "").toLowerCase();
      const termino = busquedaConductor.toLowerCase();

      const cumpleBusqueda =
        nombreConductor.includes(termino) || correoConductor.includes(termino);

      return (
        cumpleEstado &&
        cumpleTipoViaje &&
        cumpleCategoria &&
        cumpleBusqueda
      );
    });
  }, [viajes, filtroEstado, filtroTipoViaje, filtroCategoria, busquedaConductor]);

  const viajesAgrupados = useMemo(() => {
    const grupos = {};

    viajesFiltrados.forEach((viaje) => {
      const key =
        viaje.uidTaxista && String(viaje.uidTaxista).trim() !== ""
          ? viaje.uidTaxista
          : "sin-conductor";

      if (!grupos[key]) {
        grupos[key] = {
          conductorId: key,
          conductorNombre:
            key === "sin-conductor"
              ? "Sin conductor asignado"
              : viaje.conductorNombre || "Sin conductor asignado",
          conductorTelefono:
            key === "sin-conductor" ? "N/A" : viaje.conductorTelefono || "N/A",
          conductorCorreo:
            key === "sin-conductor"
              ? "No aplica"
              : viaje.conductorCorreo || "Correo no disponible",
          viajes: [],
          totalViajes: 0,
          totalIngresos: 0,
          totalKm: 0,
        };
      }

      grupos[key].viajes.push(viaje);
      grupos[key].totalViajes += 1;
      grupos[key].totalKm += Number(viaje.km || 0);

      if ((viaje.estado || "").toLowerCase() !== "cancelado") {
        grupos[key].totalIngresos += Number(viaje.total || 0);
      }
    });

    return Object.values(grupos).sort((a, b) => b.totalViajes - a.totalViajes);
  }, [viajesFiltrados]);

  const totalIngresos = viajesFiltrados.reduce((acc, viaje) => {
    if ((viaje.estado || "").toLowerCase() === "cancelado") {
      return acc;
    }
    return acc + Number(viaje.total || 0);
  }, 0);

  const viajesValidosParaIngreso = viajesFiltrados.filter(
    (v) => (v.estado || "").toLowerCase() !== "cancelado"
  ).length;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="border-b bg-white px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-800">Viajes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial agrupado por conductor
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-medium">Total viajes</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {viajesFiltrados.length}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-medium">Conductores</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {viajesAgrupados.length}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-medium">
                Total generado
              </p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                Bs. {totalIngresos.toLocaleString("es-BO")}
              </p>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Filtrar por estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[180px]"
                >
                  <option value="todos">Todos</option>
                  <option value="completado">Completados</option>
                  <option value="cancelado">Cancelados</option>
                  <option value="en_curso">En curso</option>
                  <option value="aceptado">Aceptados</option>
                  <option value="pendiente">Pendientes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Tipo de viaje
                </label>
                <select
                  value={filtroTipoViaje}
                  onChange={(e) => setFiltroTipoViaje(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[180px]"
                >
                  <option value="todos">Todos</option>
                  <option value="normal">Normales</option>
                  <option value="programado">Programados</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Categoría
                </label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[180px]"
                >
                  <option value="todos">Todos</option>
                  <option value="empresa">Empresas</option>
                  <option value="normal">Normales</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Buscar conductor o correo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez o correo"
                  value={busquedaConductor}
                  onChange={(e) => setBusquedaConductor(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[260px]"
                />
              </div>
            </div>

            <div className="text-sm text-gray-500 flex items-center gap-2">
              {loadingViajes && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                  Actualizando...
                </>
              )}
            </div>
          </div>

          {loadingViajes ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">Cargando viajes...</p>
            </div>
          ) : viajesAgrupados.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">
                No hay viajes para mostrar
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Prueba con otro filtro o revisa si existen órdenes registradas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {viajesAgrupados.map((grupo) => (
                <div
                  key={grupo.conductorId}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-gray-50 border-b px-5 py-4">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-bold text-gray-800">
                            {grupo.conductorNombre}
                          </h3>
                        </div>

                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {grupo.conductorCorreo}
                        </p>

                        <p className="text-sm text-gray-500">
                          Teléfono: {grupo.conductorTelefono}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white border rounded-xl px-4 py-3 text-center">
                          <p className="text-xs text-gray-500">Viajes</p>
                          <p className="font-bold text-gray-800">
                            {grupo.totalViajes}
                          </p>
                        </div>
                        <div className="bg-white border rounded-xl px-4 py-3 text-center">
                          <p className="text-xs text-gray-500">Km</p>
                          <p className="font-bold text-gray-800">
                            {grupo.totalKm.toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-white border rounded-xl px-4 py-3 text-center col-span-2 md:col-span-1">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-green-600">
                            Bs. {grupo.totalIngresos.toLocaleString("es-BO")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-white">
                        <tr>
                          <th className="text-left p-3 w-24">ID</th>
                          <th className="text-left p-3 w-52">Ruta</th>
                          <th className="text-left p-3 w-24">Servicio</th>
                          <th className="text-left p-3 w-24">Tipo</th>
                          <th className="text-left p-3 w-24">Categoría</th>
                          <th className="text-left p-3 w-28">Fecha</th>
                          <th className="text-left p-3 w-20">Dist.</th>
                          <th className="text-left p-3 w-24">Estado</th>
                          <th className="text-left p-3 w-24">Pago</th>
                          <th className="text-left p-3 w-24">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.viajes.map((viaje) => (
                          <tr
                            key={viaje.id}
                            className="border-b hover:bg-gray-50 transition"
                          >
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                                {String(viaje.ordenId).slice(0, 6)}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="text-xs max-w-[220px]">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                  <p
                                    className="font-medium text-gray-800 truncate"
                                    title={viaje.origen}
                                  >
                                    {viaje.origen.length > 34
                                      ? viaje.origen.slice(0, 34) + "..."
                                      : viaje.origen}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                  <p
                                    className="text-gray-500 truncate"
                                    title={viaje.destino}
                                  >
                                    {viaje.destino.length > 34
                                      ? viaje.destino.slice(0, 34) + "..."
                                      : viaje.destino}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium block text-center">
                                {viaje.servicio === "normal"
                                  ? "Normal"
                                  : viaje.servicio}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium block text-center capitalize">
                                {viaje.tipoViaje === "programado"
                                  ? "Programado"
                                  : "Normal"}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium block text-center capitalize">
                                {viaje.categoriaViaje === "empresa"
                                  ? "Empresa"
                                  : "Normal"}
                              </span>
                            </td>

                            <td className="p-3 text-xs text-gray-600">
                              <div>
                                <p className="font-medium">
                                  {viaje.fecha.toLocaleDateString("es-BO", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </p>
                                <p className="text-gray-400">
                                  {viaje.fecha.toLocaleTimeString("es-BO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="text-gray-700 font-medium text-xs">
                                {Number(viaje.km || 0).toFixed(1)} km
                              </span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold block text-center ${
                                  viaje.estado.toLowerCase() === "completado"
                                    ? "bg-green-100 text-green-700"
                                    : viaje.estado.toLowerCase() === "cancelado"
                                    ? "bg-red-100 text-red-700"
                                    : viaje.estado.toLowerCase().includes("curso")
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {viaje.estado}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1 text-xs capitalize text-gray-600">
                                <CreditCard className="w-3 h-3" />
                                {viaje.metodoPago}
                              </div>
                            </td>

                            <td className="p-3 text-right">
                              <span className="font-bold text-green-600 text-sm">
                                Bs. {Number(viaje.total || 0).toLocaleString("es-BO")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center items-center gap-2 mt-6 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Actualizando en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
}