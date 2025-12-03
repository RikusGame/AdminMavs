import { useState, useEffect } from 'react';
import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Mail, Phone, Calendar, MapPin } from 'lucide-react';

export function profiledrivers({ usuarioId, onBack }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const usuarioRef = doc(db, "pasajeros", usuarioId);
        const usuarioSnapshot = await getDoc(usuarioRef);
        
        if (usuarioSnapshot.exists()) {
          const data = usuarioSnapshot.data();
          const perfil = data.perfil || {};
          
          setUsuario({
            id: usuarioSnapshot.id,
            nombre: perfil.name || "Nombre No Disponible",
            email: perfil.email || "Correo No Disponible",
            telefono: data.telefono || "N/A",
            fecha: perfil.ultimologin ? new Date(perfil.ultimologin).toLocaleString() : "N/A",
            activo: data.activo === undefined ? true : data.activo,
            viajes: data.viajes || 0,
            photoUrl: perfil.photoUrl || null,
            color: data.color || '#4caf50',
            modo: data.modo || 'usuario',
            direccion: perfil.direccion || "No disponible",
            ciudad: perfil.ciudad || "No disponible",
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener usuario:", error);
        setLoading(false);
      }
    };

    if (usuarioId) {
      fetchUsuario();
    }
  }, [usuarioId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        <p className="text-gray-600 mt-4">Cargando perfil del usuario...</p>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <p className="text-gray-600">Usuario no encontrado</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Botón Volver */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-green-500 hover:text-green-600 mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a Usuarios
      </button>

      {/* Card de Perfil */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header con fondo */}
        <div className="h-32 bg-gradient-to-r from-green-400 to-green-500"></div>

        {/* Contenido Principal */}
        <div className="px-6 pb-6">
          {/* Avatar y Nombre */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 mb-6">
            <div>
              {usuario.photoUrl ? (
                <img 
                  src={usuario.photoUrl} 
                  alt={usuario.nombre}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg"
                  style={{ backgroundColor: usuario.color }}
                >
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">{usuario.nombre}</h1>
              <p className="text-gray-500 mt-1 text-lg">
                {usuario.modo.charAt(0).toUpperCase() + usuario.modo.slice(1)}
              </p>
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  usuario.activo 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {usuario.activo ? '✓ Activo' : '✗ Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">Correo Electrónico</span>
              </div>
              <p className="text-gray-800 font-medium break-all">{usuario.email}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">Teléfono</span>
              </div>
              <p className="text-gray-800 font-medium">{usuario.telefono}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">Último Acceso</span>
              </div>
              <p className="text-gray-800 font-medium">{usuario.fecha}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm">Ubicación</span>
              </div>
              <p className="text-gray-800 font-medium">{usuario.ciudad}</p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Estadísticas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Total de Viajes</p>
                <p className="text-3xl font-bold text-green-600">{usuario.viajes}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Modo de Usuario</p>
                <p className="text-2xl font-bold text-green-600">
                  {usuario.modo === 'pasajero' && '🚗'}
                  {usuario.modo === 'taxista' && '🚕'}
                  {usuario.modo === 'usuario' && '👤'}
                </p>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="mt-8 p-4 border-l-4 border-green-500 bg-green-50 rounded">
            <h4 className="font-semibold text-gray-800 mb-2">Dirección</h4>
            <p className="text-gray-700">{usuario.direccion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
