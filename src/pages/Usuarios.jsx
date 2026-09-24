import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, FileSpreadsheet } from 'lucide-react';
import { db } from "../config/firebase";
import { Switch } from '../ui/switch';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import EditUsuarioModal from "../modal/EditUsuarioModal";
import DeleteAlert from "../components/DeleteAlert";
import { formatFecha } from "../utils/fechas";
import { CLASES_TITULO_SECCION } from "../ui/EncabezadoSeccion";
// exportarUsuariosAExcel se importa on-demand (arrastra xlsx, ~95kB gzip) para
// que no viaje en la carga inicial del panel. (Tarjeta [224])

export function Usuarios({ onSelectUsuario }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortBy, setSortBy] = useState('fecha'); // 'fecha' | 'nombre'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  // Filtro que aplican las tarjetas de arriba: 'todos' | 'activos' |
  // 'pasajeros' | 'taxistas'. (Tarjeta [1741])
  const [filtroTarjeta, setFiltroTarjeta] = useState('todos');
  // Cuántos registros muestra el listado. El selector "Mostrar" existía en la
  // pantalla pero no estaba enganchado a nada: no tenía `value`, ni
  // `onChange`, ni estado detrás, así que elegir otra cantidad no hacía nada.
  // (Tarjeta [1741])
  const [porPagina, setPorPagina] = useState(10);

  useEffect(() => {
    setLoading(true);
    const UsersCollectionRef = collection(db, "pasajeros");

    const q = query(UsersCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedUsuarios = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const perfil = data.perfil || {};
            const documentosVehiculo = data.documentosVehiculo || {};

            let telefonoRaw = perfil.telefono || "N/A";
            let telefono = telefonoRaw;
            if (telefonoRaw !== "N/A" && telefonoRaw.startsWith(perfil.codigoPais)) {
              telefono = perfil.codigoPais +" "+ telefonoRaw.slice(4);
            }

            // Para taxistas, leer habilitado de documentosVehiculo; para otros, usar activo
            const esTaxista = data.modo === 'taxista';
            const estadoActivo = esTaxista 
              ? (documentosVehiculo.habilitado === undefined ? false : documentosVehiculo.habilitado)
              : (data.activo === undefined ? true : data.activo);

            return {
              modo: data.modo || 'usuario', 
              id: doc.id,
              nombre: perfil.name || "Nombre No Disponible",
              email: perfil.email || "Correo No Disponible",
              telefono: telefono || "N/A", 
              fecha: perfil.ultimologin ? new Date(perfil.ultimologin).toLocaleString() : "N/A",
              fechaRegistro: perfil.createdAt ?? data.createdAt ?? data.fechaRegistro ?? perfil.fechaRegistro ?? null,
              activo: estadoActivo,
              // Si la CUENTA está activa, con la misma regla para todos:
              // activa mientras nadie la haya desactivado. Es lo que escribe
              // `toggleActivo` desde el interruptor de cada fila. Va aparte de
              // `activo` a propósito: ese sigue siendo el que mira el
              // interruptor, y para un taxista significa otra cosa (si tiene
              // los documentos del vehículo habilitados). (Tarjeta [1741])
              activoCuenta: data.activo !== false,
              photoUrl: perfil.photoUrl || (perfil.name ? perfil.name.charAt(0).toUpperCase() : '👤'),
              color: data.color || '#4caf50',
            };
          })
          // Filtrar solo usuarios con nombre y correo completados
          .filter(usuario => {
            const tieneNombre = usuario.nombre && usuario.nombre !== "Nombre No Disponible" && usuario.nombre.trim() !== "";
            const tieneCorreo = usuario.email && usuario.email !== "Correo No Disponible" && usuario.email.trim() !== "";
            return tieneNombre && tieneCorreo;
          });

        setUsuarios(fetchedUsuarios);
        setLoading(false);
      },
      (error) => {
        console.error("Error al obtener los datos de los usuarios:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleActivo = async (usuarioId, currentState) => {
    try {
      const usuarioRef = doc(db, "pasajeros", usuarioId);
      await updateDoc(usuarioRef, {
        activo: !currentState
      });
    } catch (error) {
      console.error("Error al actualizar estado del usuario:", error);
    }
  };

  const toggleSort = (campo) => {
    if (sortBy === campo) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(campo);
      setSortDir(campo === 'nombre' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (campo) => {
    if (sortBy !== campo)
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-green-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-green-600" />
    );
  };

  // Los cuatro números de las tarjetas. (Tarjeta [1741])
  //
  // "Activos" contaba `u.activo`, que para un taxista NO es si la cuenta está
  // activa sino si tiene los documentos del vehículo habilitados. Como el
  // campo `activo` no está escrito en NINGUNO de los documentos, todas las
  // pasajeras caían en el valor por defecto (activa) y ningún taxista lo
  // alcanzaba: el número terminaba siendo, exactamente, la cantidad de
  // pasajeras. Por eso se veía repetido con la tarjeta "Pasajeros".
  //
  // Ahora la regla es la misma para todos y es la que escribe el interruptor
  // de cada fila: activa mientras nadie la haya desactivado.
  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter((u) => u.activoCuenta).length;
  const usuariosPasajeros = usuarios.filter((u) => u.modo === 'pasajero').length;
  const usuariosTaxistas = usuarios.filter((u) => u.modo === 'taxista').length;

  const filteredUsuarios = usuarios
    .filter((usuario) => {
      if (filtroTarjeta === 'activos') return usuario.activoCuenta;
      if (filtroTarjeta === 'pasajeros') return usuario.modo === 'pasajero';
      if (filtroTarjeta === 'taxistas') return usuario.modo === 'taxista';
      return true;
    })
    .filter((usuario) => {
      const t = searchTerm.toLowerCase();
      return (
        usuario.nombre.toLowerCase().includes(t) ||
        usuario.email.toLowerCase().includes(t)
      );
    })
    .sort((a, b) => {
      let cmp;
      if (sortBy === 'nombre') {
        cmp = (a.nombre || '').localeCompare(b.nombre || '', 'es', {
          sensitivity: 'base',
        });
      } else {
        const toMs = (v) => {
          if (!v) return 0;
          if (typeof v?.toDate === 'function') return v.toDate().getTime();
          if (typeof v?.seconds === 'number') return v.seconds * 1000;
          const d = new Date(v);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        cmp = toMs(a.fechaRegistro) - toMs(b.fechaRegistro);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // Lo que realmente se dibuja en la tabla, ya recortado a la cantidad que
  // pide el selector "Mostrar". (Tarjeta [1741])
  const usuariosVisibles = filteredUsuarios.slice(0, porPagina);

  // "Seleccionar todos" marca las filas QUE SE VEN, no las que quedaron
  // fuera del recorte: si no, un clic acá seleccionaría gente que no está en
  // pantalla y el botón de borrar se la llevaría puesta.
  const toggleSelectAll = () => {
    if (selectedUsers.length === usuariosVisibles.length && usuariosVisibles.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usuariosVisibles.map((u) => u.id));
    }
  };
  
  const handleSelectUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id)
        ? prev.filter((userId) => userId !== id)
        : [...prev, id]
    );
  };

 
  const openDeleteModal = (usuario) => {
    setUsuarioToDelete(usuario);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setUsuarioToDelete(null);
  };

  const handleDeleteUsuario = async () => {
    if (!usuarioToDelete) return;
    
    setIsDeleting(true);
    try {
      const usuarioRef = doc(db, "pasajeros", usuarioToDelete.id);
      await deleteDoc(usuarioRef);
      closeDeleteModal();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Error al eliminar el usuario");
    }
    setIsDeleting(false);
  };


  const handleImageError = (usuarioId) => {
    setImageErrors(prev => ({ ...prev, [usuarioId]: true }));
  };

  const isValidImageUrl = (url) => {
    return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
  };
  

  if (loading && usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <img src="public/images/spinner.gif" alt="Loading Spinner" className="w-10" />
        <p className="text-black-600">Cargando datos de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={CLASES_TITULO_SECCION}>Usuarios</h1>
            <p className="text-sm text-gray-500">Gestión y administración de usuarios</p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {'>'} Usuarios
          </div>
        </div>
      </div>

      {/* Al tocar una tarjeta se filtra el listado de abajo. (Tarjeta [1741]) */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {id: 'todos', n: totalUsuarios, etiqueta: 'Total Usuarios', color: '', anillo: 'ring-gray-400'},
          {id: 'activos', n: usuariosActivos, etiqueta: 'Activos', color: 'text-green-600', anillo: 'ring-green-500'},
          {id: 'pasajeros', n: usuariosPasajeros, etiqueta: 'Pasajeros', color: 'text-blue-600', anillo: 'ring-blue-500'},
          {id: 'taxistas', n: usuariosTaxistas, etiqueta: 'Taxistas', color: 'text-orange-600', anillo: 'ring-orange-500'},
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFiltroTarjeta(t.id)}
            aria-pressed={filtroTarjeta === t.id}
            className={`bg-white rounded-lg p-4 shadow-sm text-left transition hover:shadow-md ${
              filtroTarjeta === t.id ? `ring-2 ${t.anillo}` : ''
            }`}
          >
            <div className={`text-2xl mb-1 ${t.color}`}>{t.n}</div>
            <div className="text-sm text-gray-500">{t.etiqueta}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
          <button
            onClick={async () => {
              const { exportarUsuariosAExcel } = await import(
                "../utils/exportarExcel"
              );
              exportarUsuariosAExcel(filteredUsuarios);
            }}
            disabled={filteredUsuarios.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar la lista en Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel ({filteredUsuarios.length})
          </button>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar aquí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition w-full sm:w-64"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Mostrar{' '}
          <select
            className="px-2 py-1 border rounded"
            value={porPagina}
            onChange={(e) => setPorPagina(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>{' '}
          registros
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length > 0 && selectedUsers.length === usuariosVisibles.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-4">
                  <span className="text-red-500">■ Todos</span>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => toggleSort('nombre')}
                    className="inline-flex items-center gap-1 font-semibold hover:text-green-600 transition"
                    title="Ordenar por nombre"
                  >
                    Información de Usuario {sortIcon('nombre')}
                  </button>
                </th>
                <th className="text-left py-3 px-4">Correo Electrónico</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => toggleSort('fecha')}
                    className="inline-flex items-center gap-1 font-semibold hover:text-green-600 transition"
                    title="Ordenar por fecha de registro"
                  >
                    Fecha de Registro {sortIcon('fecha')}
                  </button>
                </th>
                <th className="text-left py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosVisibles.map((usuario) => (
                <tr key={usuario.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(usuario.id)}  
                      onChange={() => handleSelectUser(usuario.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="py-3 px-4">
                    {isValidImageUrl(usuario.photoUrl) && !imageErrors[usuario.id] ? (
                      <img 
                        src={usuario.photoUrl} 
                        alt={usuario.nombre}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={() => handleImageError(usuario.id)}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: usuario.color }}
                      >
                        {usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td 
                    className="py-3 px-4 cursor-pointer hover:text-green-600 hover:font-semibold transition"
                    onClick={() => onSelectUsuario(usuario.id)}
                  >
                    {usuario.nombre}
                  </td>
                  <td className="py-3 px-4 text-green-700">{usuario.email}</td>
                  <td className="py-3 px-4">{usuario.telefono}</td>

                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatFecha(usuario.fechaRegistro)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">


                      <button
                        onClick={() => openDeleteModal(usuario)}
                        className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition duration-150"
                        title="Eliminar Usuario"
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
      </div>
            
      {isDeleteModalOpen && usuarioToDelete && (
        <DeleteAlert
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteUsuario}
          itemName={usuarioToDelete.nombre}
          itemType="el usuario"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}