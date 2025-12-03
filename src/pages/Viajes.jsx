import { useState } from "react";
import { Search, Eye, MapPin, Download, UserCircle, Badge } from "lucide-react";

const viajes = [
  {
    id: "287-ce6",
    conductor: "rodrigo",
    usuario: "nombre@gmail.com",
    origen: "Avenida Daniel Salamanca 675",
    destino: "Pasaje Paredes #1216",
    fecha: "2025-10-31 14:30",
    estado: "Completado",
    precio: 25.5,
  },
  {
    id: "278-64s",
    conductor: "María González",
    usuario: "usuario2@gmail.com",
    origen: "Plaza 14 de Septiembre",
    destino: "Avenida Melchor Urquidi 1306",
    fecha: "2025-10-31 13:15",
    estado: "Completado",
    precio: 18.0,
  },
  {
    id: "267-47t",
    conductor: "José Ramírez",
    usuario: "usuario3@gmail.com",
    origen: "Avenida Ayacucho",
    destino: "Calle Hermogenes Sopa 1319",
    fecha: "2025-10-31 12:45",
    estado: "Cancelado",
    precio: 0,
  },
  {
    id: "259-8d5",
    conductor: "Ana Torres",
    usuario: "usuario4@gmail.com",
    origen: "Terminal de Buses",
    destino: "Avenida Melchor Urquidi 1247",
    fecha: "2025-10-31 11:20",
    estado: "Completado",
    precio: 32.75,
  },
  {
    id: "258-c3a",
    conductor: "Pedro Sánchez",
    usuario: "usuario5@gmail.com",
    origen: "Aeropuerto Jorge Wilstermann",
    destino: "Centro Histórico",
    fecha: "2025-10-31 10:00",
    estado: "Completado",
    precio: 45.0,
  },
  {
    id: "247-x9k",
    conductor: "Carlos Mendoza",
    usuario: "usuario6@gmail.com",
    origen: "Universidad Mayor de San Simón",
    destino: "Av. Heroínas",
    fecha: "2025-10-31 09:30",
    estado: "En Curso",
    precio: 15.5,
  },
];

export function Viajes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");

  const filteredViajes = viajes.filter((viaje) => {
    const matchesSearch =
      viaje.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      viaje.conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      viaje.usuario.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterEstado === "Todos" || viaje.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  const completados = viajes.filter((v) => v.estado === "Completado").length;
  const enCurso = viajes.filter((v) => v.estado === "En Curso").length;
  const cancelados = viajes.filter((v) => v.estado === "Cancelado").length;
  const totalIngresos = viajes
    .filter((v) => v.estado === "Completado")
    .reduce((sum, v) => sum + v.precio, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Viajes</h1>
            <p className="text-sm text-gray-500">
              Monitoreo y gestión de viajes
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {">"} Viajes
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl mb-1">{viajes.length}</div>
          <div className="text-sm text-gray-500">Total Viajes</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-green-600 mb-1">{completados}</div>
          <div className="text-sm text-gray-500">Completados</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-blue-600 mb-1">{enCurso}</div>
          <div className="text-sm text-gray-500">En Curso</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-red-600 mb-1">{cancelados}</div>
          <div className="text-sm text-gray-500">Cancelados</div>
        </div>
      </div>

      <div className="bg-linear-to-r from-blue-500 to-blue-600 rounded-lg p-6 mb-6 text-white">
        <div className="text-sm mb-1">Ingresos Totales (Octubre 2025)</div>
        <div className="text-3xl">Bs. {totalIngresos.toFixed(2)}</div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Completado</option>
              <option>En Curso</option>
              <option>Cancelado</option>
            </select>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar viajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">ID del Viaje</th>
                <th className="text-left py-3 px-4">Conductor</th>
                <th className="text-left py-3 px-4">Usuario</th>
                <th className="text-left py-3 px-4">
                  Detalles de la Ubicación
                </th>
                <th className="text-left py-3 px-4">Fecha y Hora</th>
                <th className="text-left py-3 px-4">Estado</th>
                <th className="text-left py-3 px-4">Precio</th>
                <th className="text-left py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredViajes.map((viaje) => (
                <tr key={viaje.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-red-500">{viaje.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm">{viaje.conductor}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-red-500">
                    {viaje.usuario}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-600" />
                        <span className="text-xs text-gray-600">
                          {viaje.origen}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-600" />
                        <span className="text-xs text-gray-600">
                          {viaje.destino}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {viaje.fecha}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        viaje.estado === "Completado"
                          ? "default"
                          : viaje.estado === "En Curso"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {viaje.estado}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {viaje.precio > 0 ? `Bs. ${viaje.precio.toFixed(2)}` : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-blue-500 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
