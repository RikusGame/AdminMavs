import { useState, useEffect } from 'react';
import { db } from "../config/firebase";
import { doc, getDoc, updateDoc, collection, query, orderBy, limit, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { ArrowLeft, Mail, Phone, TrendingUp, TrendingDown, MapPin, DollarSign, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { AgregarMontoModal } from "../modal/AgregarMontoModal";

export function PerfilConductor({ conductorId, onBack }) {
  const [conductor, setConductor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('viajes');
  const [isAgregarMontoOpen, setIsAgregarMontoOpen] = useState(false);
  const [transacciones, setTransacciones] = useState([]);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [viajes, setViajes] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [filtroViajes, setFiltroViajes] = useState('todos'); // todos, completado, cancelado
  const [paginaViajes, setPaginaViajes] = useState(1);
  const viajesPorPagina = 10;

  const handleMontoAdded = (nuevoSaldo) => {
    setConductor(prev => ({
      ...prev,
      saldo: nuevoSaldo
    }));
  };

  // Cargar datos del conductor
  useEffect(() => {
    if (!conductorId) return;

    const fetchConductor = async () => {
      setLoading(true);
      try {
        const conductorRef = doc(db, "taxistas", conductorId);
        const conductorSnapshot = await getDoc(conductorRef);
        
        if (conductorSnapshot.exists()) {
          let data = conductorSnapshot.data();
          
          const perfil = data.perfilTaxista || {};
          const vehiculo = data.vehiculo || {};
          
          // Leer saldo desde el documento billetera/saldo
          let saldoActual = 0;
          try {
            const saldoDocRef = doc(db, "taxistas", conductorId, "billetera", "saldo");
            const saldoDoc = await getDoc(saldoDocRef);
            
            if (saldoDoc.exists()) {
              saldoActual = saldoDoc.data().saldo || 0;
              console.log("💰 Saldo desde taxistas/{id}/billetera/saldo:", saldoActual);
            } else {
              console.log("⚠️ Documento saldo no existe");
            }
          } catch (saldoError) {
            console.error("❌ Error al leer saldo:", saldoError);
          }
          
          console.log("📄 Datos del conductor:", { perfil, vehiculo, saldoActual });
          
          setConductor({
            id: conductorSnapshot.id,
            nombre: perfil.nombre || "Nombre No Disponible",
            email: perfil.correo || "Correo No Disponible",
            telefono: perfil.telefono || "N/A",
            fotoPerfilUrl: perfil.FotoPerfil || perfil.fotoPerfil || null,
            habilitado: data.habilitado || false,
            saldo: saldoActual,
            viajes: data.viajes || 0,
            calificacion: data.calificacion || 0,
            marca_vehiculo: vehiculo.marca || "No disponible",
            modelo_vehiculo: vehiculo.modelo || "No disponible",
            placa_vehiculo: vehiculo.placa || "No disponible",
          });
        } else {
          console.error("❌ Conductor no encontrado");
        }
      } catch (error) {
        console.error("❌ Error al cargar conductor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConductor();
  }, [conductorId]);

  // Stream en tiempo real de transacciones de billetera
  useEffect(() => {
    if (!conductorId) return;

    setLoadingTransacciones(true);
    const recargasRef = collection(db, "taxistas", conductorId, "billetera", "historial", "recargas");
    
    // Intentar sin orderBy primero para ver si hay datos
    const q = query(recargasRef, limit(50));

    console.log(`🔍 Buscando recargas en: taxistas/${conductorId}/billetera/historial/recargas`);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const trans = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`📄 Recarga encontrada:`, { id: doc.id, ...data });
          return {
            id: doc.id,
            ...data
          };
        });
        
        // Ordenar por fecha en JavaScript si existe el campo
        trans.sort((a, b) => {
          const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(0);
          const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(0);
          return fechaB - fechaA;
        });
        
        setTransacciones(trans);
        setLoadingTransacciones(false);
        console.log(`📊 ${trans.length} recargas cargadas desde taxistas/${conductorId}/billetera/historial/recargas`);
        
        if (trans.length === 0) {
          console.log(`⚠️ No se encontraron recargas. Verifica que existan documentos en esta ruta.`);
        }
      },
      (error) => {
        console.error("❌ Error al escuchar transacciones:", error);
        console.error("Detalles del error:", error.code, error.message);
        setLoadingTransacciones(false);
      }
    );

    return () => unsubscribe();
  }, [conductorId]);

  // Stream en tiempo real de viajes del conductor
  useEffect(() => {
    if (!conductorId) return;

    setLoadingViajes(true);
    
    // Consulta usando collectionGroup para buscar en todas las subcolecciones 'ordenes'
    const ordenesQuery = query(
      collectionGroup(db, 'ordenes'),
      where('uidTaxista', '==', conductorId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      ordenesQuery,
      (snapshot) => {
        const viajesData = snapshot.docs.map(doc => {
          const data = doc.data();
          const origen = data.origen || {};
          const destino = data.destino || {};
          const tarifa = data.tarifa || {};
          
          // Obtener nombre del servicio: prioridad al campo 'servicio', luego 'tipo'
          let nombreServicio = 'Normal';
          if (data.servicio && typeof data.servicio === 'string') {
            nombreServicio = data.servicio;
          } else if (data.tipo && typeof data.tipo === 'string') {
            nombreServicio = data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1);
          }
          
          return {
            id: doc.id,
            ordenId: data.ordenId || doc.id,
            uidPasajero: data.uidPasajero || data.idPasajero || 'N/A',
            origen: origen.texto || origen.calle || 'Origen no disponible',
            destino: destino.texto || destino.calle || 'Destino no disponible',
            fecha: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            estado: data.estado || 'pendiente',
            metodoPago: data.metodoPago || 'efectivo',
            total: tarifa.total || data.total || 0,
            km: tarifa.km || data.km || 0,
            servicio: nombreServicio,
            estadoPago: data.estadoPago || 'pendiente',
          };
        });

        setViajes(viajesData);
        setLoadingViajes(false);
        console.log(`🚗 ${viajesData.length} viajes cargados del conductor`);
      },
      (error) => {
        console.error("Error al cargar viajes:", error);
        setLoadingViajes(false);
      }
    );

    return () => unsubscribe();
  }, [conductorId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        <p className="text-gray-600 mt-4">Cargando perfil del conductor...</p>
      </div>
    );
  }

  if (!conductor) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <p className="text-gray-600">Conductor no encontrado</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Volver a Conductores
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Botón Volver */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-6 font-semibold transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a Conductores
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO - Información del Conductor */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header oscuro */}
            <div className="bg-gray-900 h-32"></div>

            {/* Contenido */}
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="flex justify-center -mt-16 mb-4">
                {conductor.fotoPerfilUrl ? (
                  <img 
                    src={conductor.fotoPerfilUrl} 
                    alt={conductor.nombre}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg bg-green-500">
                    {conductor.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Nombre */}
              <h2 className="text-center text-2xl font-bold text-gray-800 mb-1">{conductor.nombre}</h2>
              <p className="text-center text-gray-500 text-sm mb-4">Conductor Taxista</p>

              {/* Saldo */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center mb-4">
                <p className="text-gray-600 text-sm font-semibold">Saldo de la Billetera</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  Bs. {conductor.saldo.toLocaleString('es-BO')}
                </p>
              </div>

              {/* Botones de Acción */}
              <button 
                onClick={() => setIsAgregarMontoOpen(true)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg mb-4 transition duration-200"
              >
                Agregar Monto a la Billetera
              </button>

              {/* Información de Contacto */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 text-sm break-all">{conductor.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 text-sm">{conductor.telefono}</span>
                </div>
              </div>

              {/* Información del Vehículo */}
              <div className="border-t mt-4 pt-4">
                <h3 className="font-bold text-gray-800 mb-3">Información del Vehículo</h3>
                {conductor.marca_vehiculo !== "No disponible" ? (
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <p><span className="font-semibold text-gray-700">Marca:</span> {conductor.marca_vehiculo}</p>
                    <p><span className="font-semibold text-gray-700">Modelo:</span> {conductor.modelo_vehiculo}</p>
                    <p><span className="font-semibold text-gray-700">Placa:</span> <span className="uppercase font-mono">{conductor.placa_vehiculo}</span></p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg">No se Encontró Información del Vehículo</p>
                )}
              </div>


            </div>
          </div>
        </div>

        {/* PANEL DERECHO - Tabs y Contenido */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex flex-wrap border-b bg-gray-50">
              <button
                onClick={() => setActiveTab('viajes')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition ${
                  activeTab === 'viajes'
                    ? 'text-green-600 border-b-2 border-green-600 bg-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Historial de Viajes
              </button>
              <button
                onClick={() => setActiveTab('transacciones')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition ${
                  activeTab === 'transacciones'
                    ? 'text-green-600 border-b-2 border-green-600 bg-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Transacciones de Billetera
              </button>
            </div>

            {/* Contenido de Tabs */}
            <div className="p-6">
              {/* Tab: Lista de Viajes */}
              {activeTab === 'viajes' && (() => {
                const viajesFiltrados = viajes.filter(v => filtroViajes === 'todos' || v.estado.toLowerCase() === filtroViajes);
                const totalPaginas = Math.ceil(viajesFiltrados.length / viajesPorPagina);
                const indiceInicio = (paginaViajes - 1) * viajesPorPagina;
                const indiceFin = indiceInicio + viajesPorPagina;
                const viajesPaginados = viajesFiltrados.slice(indiceInicio, indiceFin);

                return (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
                      <select 
                        value={filtroViajes}
                        onChange={(e) => {
                          setFiltroViajes(e.target.value);
                          setPaginaViajes(1); // Resetear a página 1 al cambiar filtro
                        }}
                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="todos">Todos</option>
                        <option value="completado">Completados</option>
                        <option value="cancelado">Cancelados</option>
                        <option value="en_curso">En Curso</option>
                        <option value="aceptado">Aceptados</option>
                      </select>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {viajesFiltrados.length} viajes
                      </span>
                    </div>
                    {loadingViajes && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                        Actualizando...
                      </div>
                    )}
                  </div>

                  {viajesFiltrados.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-500 font-medium">No hay viajes registrados</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {filtroViajes === 'todos' 
                          ? 'Los viajes del conductor aparecerán aquí'
                          : `No hay viajes con estado "${filtroViajes}"`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="text-left p-3 w-24">ID</th>
                            <th className="text-left p-3 w-48">Ruta</th>
                            <th className="text-left p-3 w-20">Servicio</th>
                            <th className="text-left p-3 w-32">Fecha</th>
                            <th className="text-left p-3 w-20">Dist.</th>
                            <th className="text-left p-3 w-28">Estado</th>
                            <th className="text-left p-3 w-24">Pago</th>
                            <th className="text-left p-3 w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viajesPaginados.map((viaje) => (
                            <tr key={viaje.id} className="border-b hover:bg-gray-50 transition">
                              <td className="p-3">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                                  {viaje.ordenId.slice(0, 6)}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="text-xs max-w-[200px]">
                                  <div className="flex items-center gap-1 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                    <p className="font-medium text-gray-800 truncate" title={viaje.origen}>
                                      {viaje.origen.length > 30 ? viaje.origen.slice(0, 30) + '...' : viaje.origen}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                    <p className="text-gray-500 truncate" title={viaje.destino}>
                                      {viaje.destino.length > 30 ? viaje.destino.slice(0, 30) + '...' : viaje.destino}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium block text-center">
                                  {viaje.servicio === 'normal' ? 'Normal' : viaje.servicio}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-gray-600">
                                <div>
                                  <p className="font-medium">{viaje.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}</p>
                                  <p className="text-gray-400">{viaje.fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="text-gray-700 font-medium text-xs">{viaje.km.toFixed(1)} km</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold block text-center ${
                                  viaje.estado.toLowerCase() === 'completado' 
                                    ? 'bg-green-100 text-green-700'
                                    : viaje.estado.toLowerCase() === 'cancelado'
                                    ? 'bg-red-100 text-red-700'
                                    : viaje.estado.toLowerCase().includes('curso')
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {viaje.estado.length > 10 ? viaje.estado.slice(0, 10) : viaje.estado}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-xs capitalize text-gray-600">{viaje.metodoPago}</span>
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-bold text-green-600 text-sm">
                                  Bs. {viaje.total.toLocaleString('es-BO')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Paginación */}
                  {viajesFiltrados.length > viajesPorPagina && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Mostrando {indiceInicio + 1} - {Math.min(indiceFin, viajesFiltrados.length)} de {viajesFiltrados.length} viajes
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPaginaViajes(prev => Math.max(1, prev - 1))}
                          disabled={paginaViajes === 1}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            paginaViajes === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          ← Anterior
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                            <button
                              key={num}
                              onClick={() => setPaginaViajes(num)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                                paginaViajes === num
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setPaginaViajes(prev => Math.min(totalPaginas, prev + 1))}
                          disabled={paginaViajes === totalPaginas}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            paginaViajes === totalPaginas
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Siguiente →
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center items-center gap-2 mt-4 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Actualizando en tiempo real</span>
                  </div>
                </div>
                );
              })()}

              {/* Tab: Historial de Recargas */}
              {activeTab === 'transacciones' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">Historial de Recargas</h3>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {transacciones.length} recargas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {loadingTransacciones && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          Actualizando...
                        </div>
                      )}
                    </div>
                  </div>

                  {transacciones.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-gray-700 font-semibold text-lg">Sin recargas</p>
                      <p className="text-gray-500 text-sm mt-2">Cuando tengas recargas, verás el historial aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transacciones.map((trans) => {
                        const fecha = trans.fecha?.toDate ? trans.fecha.toDate() : new Date();
                        const metodoPago = trans.metodoPago || 'efectivo';
                        
                        // Función para obtener el título según método de pago
                        const getTitulo = (metodo) => {
                          switch(metodo.toLowerCase()) {
                            case 'transferencia': return 'Recarga por Transferencia';
                            case 'efectivo': return 'Recarga en Efectivo';
                            case 'tarjeta': return 'Recarga con Tarjeta';
                            default: return 'Recarga';
                          }
                        };

                        // Icono según método de pago
                        const getIcono = (metodo) => {
                          switch(metodo.toLowerCase()) {
                            case 'transferencia': return '↔️';
                            case 'efectivo': return '💵';
                            case 'tarjeta': return '💳';
                            default: return '💰';
                          }
                        };

                        const estado = trans.estado || 'completado';
                        
                        return (
                          <div key={trans.id} className="bg-white border border-green-100 rounded-2xl p-4 hover:shadow-lg transition">
                            <div className="flex items-start gap-3">
                              {/* Icono del método de pago */}
                              <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">{getIcono(metodoPago)}</span>
                              </div>

                              {/* Información principal */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-extrabold text-gray-900 text-sm mb-1">
                                  {getTitulo(metodoPago)}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2 truncate">
                                  {trans.notas || trans.referencia || 'Sin detalles'}
                                </p>
                                
                                {/* Estado y hora */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                    estado.toLowerCase() === 'completado' 
                                      ? 'bg-green-100 text-green-800'
                                      : estado.toLowerCase() === 'pendiente'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {estado === 'completado' ? 'Completado' : estado === 'pendiente' ? 'Pendiente' : 'Fallido'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} • {fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>

                              {/* Monto */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-extrabold text-green-700">
                                  +Bs. {trans.monto?.toLocaleString('es-BO') || '0'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-center items-center gap-2 mt-6 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Actualizando en tiempo real</span>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Modal Agregar Monto */}
      <AgregarMontoModal 
        isOpen={isAgregarMontoOpen} 
        onClose={() => setIsAgregarMontoOpen(false)}
        conductorNombre={conductor?.nombre}
        conductorId={conductorId}
        onMontoAdded={handleMontoAdded}
      />
    </div>
  );
}
