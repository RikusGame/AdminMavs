import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, Trash2, UserCircle, Download } from 'lucide-react';
import { db } from "../config/firebase";
import { Switch } from '../ui/switch';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import EditUsuarioModal from "../modal/EditUsuarioModal";
import DeleteAlert from "../components/DeleteAlert";

export function Usuarios({ onSelectUsuario }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [modoFilter, setModoFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

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

            let telefonoRaw = perfil.telefono || "N/A";
            let telefono = telefonoRaw;
            if (telefonoRaw !== "N/A" && telefonoRaw.startsWith(perfil.codigoPais)) {
              telefono = perfil.codigoPais +" "+ telefonoRaw.slice(4);
            }

            return {
              modo: data.modo || 'usuario', 
              id: doc.id,
              nombre: perfil.name || "Nombre No Disponible",
              email: perfil.email || "Correo No Disponible",
              telefono: telefono || "N/A", 
              fecha: perfil.ultimologin ? new Date(perfil.ultimologin).toLocaleString() : "N/A", 
              activo: data.activo === undefined ? true : data.activo,
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

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = modoFilter === 'todos' || usuario.modo === modoFilter;
    const matchesEstado = estadoFilter === 'todos' || 
                          (estadoFilter === 'activo' && usuario.activo) ||
                          (estadoFilter === 'inactivo' && !usuario.activo);

    return matchesSearch && matchesMode && matchesEstado;
  });

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsuarios.length && filteredUsuarios.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsuarios.map((u) => u.id));
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
            <h1>Usuarios</h1>
            <p className="text-sm text-gray-500">Gestión y administración de usuarios</p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {'>'} Usuarios
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl mb-1">{usuarios.length}</div>
          <div className="text-sm text-gray-500">Total Usuarios</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-green-600 mb-1">{usuarios.filter(u => u.activo).length}</div>
          <div className="text-sm text-gray-500">Activos</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-blue-600 mb-1">{usuarios.filter(u => u.modo === 'pasajero').length}</div>
          <div className="text-sm text-gray-500">Pasajeros</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-orange-600 mb-1">{usuarios.filter(u => u.modo === 'taxista').length}</div>
          <div className="text-sm text-gray-500">Taxistas</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select 
              value={modoFilter}
              onChange={(e) => setModoFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todos los Modos</option>
              <option value="pasajero">Pasajero</option>
              <option value="taxista">Taxista</option>
              <option value="usuario">Otro/Usuario</option>
            </select>

            <select 
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Estado</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar aquí..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Mostrar <select className="px-2 py-1 border rounded"><option>10</option><option>25</option><option>50</option></select> registros
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsuarios.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-4">
                  <span className="text-red-500">■ Todos</span>
                </th>
                <th className="text-left py-3 px-4">Información de Usuario</th>
                <th className="text-left py-3 px-4">Correo Electrónico</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                <th className="text-left py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((usuario) => (
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