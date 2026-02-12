import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Users, UserCircle, Star, Edit, MapPin, Settings, LogOut, User, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { collectionGroup, query, where, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";

const mejoresConductores = [
  {
    nombre: "rodrigo",
    avatar: "👤",
    calificacion: 4,
    direccion: "Avenida Daniel Salamanca 675",
    direccion2: "Pasaje Paredes #1216",
  },
  {
    nombre: "Cristhian Rojas",
    avatar: "👤",
    calificacion: 4,
    direccion: "Avenida Daniel Salamanca 675",
    direccion2: "Avenida Melchor Urquidi 1306",
  },
  {
    nombre: "Doris Andrinah Masercardos Arisym",
    avatar: "👨",
    calificacion: 5,
    direccion: "Avenida Daniel Salamanca 675",
    direccion2: "Avenida Melchor Urquidi 1247",
  },
  {
    nombre: "Nicol salinas",
    avatar: "👤",
    calificacion: 5,
    direccion: "Avenida Daniel Salamanca 675",
    direccion2: "Calle Hermogenes Sopa 1319",
  },
  {
    nombre: "Riku",
    avatar: "👤",
    calificacion: 0,
    direccion: "Avenida Daniel Salamanca 675",
    direccion2: "Avenida Melchor Urquidi 1320",
  },
];

export function Dashboard() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  
  // Estados para los datos del dashboard
  const [viajesRecientes, setViajesRecientes] = useState([]);
  const [estadisticasViajes, setEstadisticasViajes] = useState({
    solicitados: 0,
    completados: 0,
    cancelados: 0,
    total: 0
  });
  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [comisionesTotal, setComisionesTotal] = useState(0);
  const [recargasTotal, setRecargasTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Estados temporales para almacenar datos de cada listener
  const [todosLosViajes, setTodosLosViajes] = useState([]);
  const [todasLasComisiones, setTodasLasComisiones] = useState(new Map());
  const [todasLasRecargas, setTodasLasRecargas] = useState(0);

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listener 1: Viajes en tiempo real
  useEffect(() => {
    console.log('🔍 Iniciando listener de VIAJES...');
    const ordenesQuery = collectionGroup(db, 'ordenes');

    const unsubscribe = onSnapshot(
      ordenesQuery,
      (snapshot) => {
        console.log('📊 Viajes actualizados:', snapshot.size);
        
        const viajes = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          viajes.push({ 
            id: doc.id, 
            ordenId: data.ordenId || doc.id,
            ...data 
          });
        });

        setTodosLosViajes(viajes);
      },
      (error) => {
        console.error('❌ Error en listener de viajes:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listener 2: Comisiones en tiempo real
  useEffect(() => {
    console.log('💰 Iniciando listener de COMISIONES...');
    const comisionesQuery = collectionGroup(db, 'comisiones');

    const unsubscribe = onSnapshot(
      comisionesQuery,
      (snapshot) => {
        console.log('📋 Comisiones actualizadas:', snapshot.size);
        
        const comisionesPorViaje = new Map();
        snapshot.forEach((doc) => {
          const comision = doc.data();
          const montoComision = Number(comision.montoComision || 0);
          const viajeId = comision.viajeId || comision.ordenId;
          
          if (viajeId && montoComision > 0) {
            comisionesPorViaje.set(viajeId, {
              monto: montoComision,
              fecha: comision.fecha,
              porcentaje: comision.porcentajeComision
            });
          }
        });

        setTodasLasComisiones(comisionesPorViaje);
      },
      (error) => {
        console.error('❌ Error en listener de comisiones:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listener 3: Recargas en tiempo real
  useEffect(() => {
    console.log('💵 Iniciando listener de RECARGAS...');
    const recargasQuery = collectionGroup(db, 'recargas');

    const unsubscribe = onSnapshot(
      recargasQuery,
      (snapshot) => {
        console.log('💳 Recargas actualizadas:', snapshot.size);
        
        let total = 0;
        snapshot.forEach((doc) => {
          const recarga = doc.data();
          const monto = Number(recarga.monto || 0);
          total += monto;
        });

        setTodasLasRecargas(total);
      },
      (error) => {
        console.error('❌ Error en listener de recargas:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Efecto para procesar y actualizar todos los datos cuando cambian
  useEffect(() => {
    if (todosLosViajes.length === 0 && todasLasComisiones.size === 0) {
      setCargando(true);
      return;
    }

    console.log('🔄 Procesando datos combinados...');

    // Calcular estadísticas de viajes
    const estadisticas = {
      completados: 0,
      cancelados: 0,
      total: 0
    };

    const ingresosMensuales = {};
    const viajesConComision = [];

    todosLosViajes.forEach((viaje) => {
      const estado = viaje.estado || viaje.status || '';
      estadisticas.total++;

      // Contar por estado
      if (estado === 'completado' || estado === 'finalizado') {
        estadisticas.completados++;
      } else if (estado === 'cancelado') {
        estadisticas.cancelados++;
      }

      // Asociar comisión con viaje
      const viajeId = viaje.ordenId || viaje.id;
      const comisionData = todasLasComisiones.get(viajeId);
      
      viajesConComision.push({
        ...viaje,
        comisionReal: comisionData?.monto || 0
      });

      // Agrupar ingresos por mes (solo viajes con comisión)
      if (comisionData && comisionData.fecha) {
        try {
          const fecha = comisionData.fecha.toDate ? comisionData.fecha.toDate() : new Date(comisionData.fecha);
          const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
          
          if (!ingresosMensuales[mesKey]) {
            ingresosMensuales[mesKey] = {
              mes: fecha.toLocaleDateString('es-BO', { month: 'short' }).toUpperCase(),
              viajes: 0,
              comisiones: 0,
              fecha: fecha,
              viajesContados: new Set()
            };
          }
          
          ingresosMensuales[mesKey].comisiones += comisionData.monto;
          if (!ingresosMensuales[mesKey].viajesContados.has(viajeId)) {
            ingresosMensuales[mesKey].viajes++;
            ingresosMensuales[mesKey].viajesContados.add(viajeId);
          }
        } catch (e) {
          console.warn('Error al procesar fecha:', e);
        }
      }
    });

    // Calcular total de comisiones
    let comisionTotal = 0;
    todasLasComisiones.forEach((data) => {
      comisionTotal += data.monto;
    });

    // Ordenar viajes por fecha
    viajesConComision.sort((a, b) => {
      const fechaA = a.createdAt || a.fechaCreacion || a.fecha || a.timestamp;
      const fechaB = b.createdAt || b.fechaCreacion || b.fecha || b.timestamp;
      if (!fechaA) return 1;
      if (!fechaB) return -1;
      const timeA = fechaA.toDate ? fechaA.toDate().getTime() : new Date(fechaA).getTime();
      const timeB = fechaB.toDate ? fechaB.toDate().getTime() : new Date(fechaB).getTime();
      return timeB - timeA;
    });

    // Convertir ingresos mensuales a array
    const ingresosArray = Object.values(ingresosMensuales)
      .sort((a, b) => a.fecha - b.fecha)
      .slice(-6);

    console.log('✅ Datos actualizados:', {
      totalViajes: todosLosViajes.length,
      estadisticas,
      comisionTotal: `Bs. ${comisionTotal.toFixed(2)}`,
      totalRecargas: `Bs. ${todasLasRecargas.toFixed(2)}`,
      mesesConDatos: ingresosArray.length
    });

    // Actualizar estados
    setViajesRecientes(viajesConComision.slice(0, 5));
    setEstadisticasViajes(estadisticas);
    setIngresosPorMes(ingresosArray);
    setComisionesTotal(comisionTotal);
    setRecargasTotal(todasLasRecargas);
    setCargando(false);

  }, [todosLosViajes, todasLasComisiones, todasLasRecargas]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Panel de Control</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 bg-[#a8d96f] rounded-full flex items-center justify-center hover:bg-[#96c55f] transition-colors"
            >
              <UserCircle className="w-6 h-6 text-white" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                <div className="py-1">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 md:p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs md:text-sm font-medium">Completados</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2">{cargando ? '...' : estadisticasViajes.completados}</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 md:p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs md:text-sm font-medium">Cancelados</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2">{cargando ? '...' : estadisticasViajes.cancelados}</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <MapPin className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 md:p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs md:text-sm font-medium">Comisiones Total</p>
              <h3 className="text-xl md:text-3xl font-bold mt-2">
                {cargando ? '...' : `Bs. ${comisionesTotal.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 md:p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-xs md:text-sm font-medium">Recargas Total</p>
              <h3 className="text-xl md:text-3xl font-bold mt-2">
                {cargando ? '...' : `Bs. ${recargasTotal.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Comparativos Mejorados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico Comparativo: Viajes e Ingresos por Mes */}
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
          <h3 className="mb-4 text-sm md:text-base font-semibold text-gray-800">Comparativa Mensual: Viajes e Ingresos</h3>
          {cargando ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-gray-400">Cargando datos...</p>
            </div>
          ) : ingresosPorMes.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-gray-400">No hay datos disponibles</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ingresosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 11 }} 
                    label={{ value: 'Viajes', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Comisiones (Bs.)', angle: 90, position: 'insideRight', fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'viajes') return [value, 'Viajes'];
                      if (name === 'comisiones') return [`Bs. ${value.toFixed(2)}`, 'Comisiones'];
                      return value;
                    }}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => {
                      if (value === 'viajes') return 'Cantidad de Viajes';
                      if (value === 'comisiones') return 'Ingresos por Comisiones';
                      return value;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="viajes" fill="#4169E1" name="viajes" />
                  <Bar yAxisId="right" dataKey="comisiones" fill="#a8d96f" name="comisiones" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-gray-500 mt-2">Comparativa de los últimos 6 meses</p>
            </>
          )}
        </div>

        {/* Gráfico de Tendencia de Viajes */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="mb-4 font-semibold text-gray-800">Tendencia de Viajes por Mes</h3>
          {cargando ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-gray-400">Cargando datos...</p>
            </div>
          ) : ingresosPorMes.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-gray-400">No hay datos disponibles</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ingresosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'viajes') return [value, 'Total de Viajes'];
                      return value;
                    }}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={() => 'Cantidad de Viajes'}
                  />
                  <Bar 
                    dataKey="viajes" 
                    fill="#4169E1" 
                    name="viajes"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-2 md:p-3">
                  <p className="text-xs text-gray-600">Total Viajes</p>
                  <p className="text-base md:text-lg font-bold text-blue-600">
                    {ingresosPorMes.reduce((sum, item) => sum + item.viajes, 0)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 md:p-3">
                  <p className="text-xs text-gray-600">Promedio/Mes</p>
                  <p className="text-base md:text-lg font-bold text-green-600">
                    {Math.round(ingresosPorMes.reduce((sum, item) => sum + item.viajes, 0) / ingresosPorMes.length)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 md:p-3">
                  <p className="text-xs text-gray-600">Mejor Mes</p>
                  <p className="text-base md:text-lg font-bold text-purple-600">
                    {Math.max(...ingresosPorMes.map(item => item.viajes))}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gráfico de Estado de Viajes */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
          <h3 className="mb-4 text-sm md:text-base font-semibold text-gray-800">Estado Actual de Viajes</h3>
          {cargando ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-gray-400">Cargando datos...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={250} height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completados', value: estadisticasViajes.completados, color: '#32CD32' },
                        { name: 'Cancelados', value: estadisticasViajes.cancelados, color: '#FF6347' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="#32CD32" />
                      <Cell fill="#FF6347" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full">
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#32CD32]"></div>
                    <span className="text-sm font-medium text-gray-700">Completados</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{estadisticasViajes.completados}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {estadisticasViajes.total > 0 
                      ? `${((estadisticasViajes.completados / estadisticasViajes.total) * 100).toFixed(1)}%` 
                      : '0%'} del total
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF6347]"></div>
                    <span className="text-sm font-medium text-gray-700">Cancelados</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{estadisticasViajes.cancelados}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {estadisticasViajes.total > 0 
                      ? `${((estadisticasViajes.cancelados / estadisticasViajes.total) * 100).toFixed(1)}%` 
                      : '0%'} del total
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viajes Recientes - Expandido a ancho completo */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-md">
        <h3 className="mb-4 text-sm md:text-base font-semibold text-gray-800">Viajes Recientes</h3>
          {cargando ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-400">Cargando viajes...</p>
            </div>
          ) : viajesRecientes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-400">No hay viajes recientes</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block space-y-1">
                <div className="grid grid-cols-5 gap-4 pb-2 border-b text-xs text-gray-500 font-medium">
                  <div>Estado</div>
                  <div>Total</div>
                  <div>Comisión</div>
                  <div>Fecha</div>
                  <div>Ubicaciones</div>
                </div>
                {viajesRecientes.map((viaje) => {
                const estado = viaje.status || viaje.estado || 'desconocido';
                const estadoColor = 
                  estado === 'completado' || estado === 'finalizado' ? 'text-green-600' :
                  estado === 'cancelado' ? 'text-red-600' :
                  'text-orange-600';
                
                const estadoTexto = 
                  estado === 'completado' || estado === 'finalizado' ? 'Completado' :
                  estado === 'cancelado' ? 'Cancelado' :
                  estado === 'solicitado' ? 'Solicitado' :
                  estado === 'buscando' ? 'Buscando' :
                  estado === 'en_camino' ? 'En Camino' :
                  estado.charAt(0).toUpperCase() + estado.slice(1);

                const tarifa = viaje.tarifa || {};
                const total = Number(tarifa.total || viaje.total || viaje.costo || viaje.precio || 0);
                // Usar la comisión real cargada desde la subcolección
                const comision = Number(viaje.comisionReal || 0);
                
                // Manejar diferentes formatos de fecha
                let fecha = 'N/A';
                try {
                  const fechaCampo = viaje.createdAt || viaje.fechaCreacion || viaje.fecha || viaje.timestamp;
                  if (fechaCampo) {
                    const fechaObj = fechaCampo.toDate ? fechaCampo.toDate() : new Date(fechaCampo);
                    fecha = fechaObj.toLocaleDateString('es-BO', { 
                      day: '2-digit', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  }
                } catch (e) {
                  fecha = 'N/A';
                }

                const origen = viaje.origen || {};
                const destino = viaje.destino || {};

                return (
                  <div
                    key={viaje.id}
                    className="grid grid-cols-5 gap-4 py-3 border-b border-gray-100 text-sm"
                  >
                    <div className={`font-semibold ${estadoColor}`}>{estadoTexto}</div>
                    <div className="text-gray-700 font-medium">Bs. {total.toFixed(2)}</div>
                    <div className="text-green-600 font-semibold">Bs. {comision.toFixed(2)}</div>
                    <div className="text-gray-600 text-xs">{fecha}</div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-green-600" />
                        <span className="text-xs text-gray-600 line-clamp-1">
                          {origen.texto || origen.calle || origen.direccion || viaje.origenDireccion || 'Origen no disponible'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-red-600" />
                        <span className="text-xs text-gray-600 line-clamp-1">
                          {destino.texto || destino.calle || destino.direccion || viaje.destinoDireccion || 'Destino no disponible'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {viajesRecientes.map((viaje) => {
                  const estado = viaje.status || viaje.estado || 'desconocido';
                  const estadoColor = 
                    estado === 'completado' || estado === 'finalizado' ? 'text-green-600 bg-green-50' :
                    estado === 'cancelado' ? 'text-red-600 bg-red-50' :
                    'text-orange-600 bg-orange-50';
                  
                  const estadoTexto = 
                    estado === 'completado' || estado === 'finalizado' ? 'Completado' :
                    estado === 'cancelado' ? 'Cancelado' :
                    estado === 'solicitado' ? 'Solicitado' :
                    estado === 'buscando' ? 'Buscando' :
                    estado === 'en_camino' ? 'En Camino' :
                    estado.charAt(0).toUpperCase() + estado.slice(1);

                  const tarifa = viaje.tarifa || {};
                  const total = Number(tarifa.total || viaje.total || viaje.costo || viaje.precio || 0);
                  const comision = Number(viaje.comisionReal || 0);
                  
                  let fecha = 'N/A';
                  try {
                    const fechaCampo = viaje.createdAt || viaje.fechaCreacion || viaje.fecha || viaje.timestamp;
                    if (fechaCampo) {
                      const fechaObj = fechaCampo.toDate ? fechaCampo.toDate() : new Date(fechaCampo);
                      fecha = fechaObj.toLocaleDateString('es-BO', { 
                        day: '2-digit', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }
                  } catch (e) {
                    fecha = 'N/A';
                  }

                  const origen = viaje.origen || {};
                  const destino = viaje.destino || {};

                  return (
                    <div key={viaje.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor}`}>
                          {estadoTexto}
                        </span>
                        <span className="text-xs text-gray-500">{fecha}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-sm font-bold text-gray-700">Bs. {total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Comisión</p>
                          <p className="text-sm font-bold text-green-600">Bs. {comision.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1 pt-2 border-t border-gray-100">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-green-600" />
                          <span className="text-xs text-gray-600 line-clamp-2">
                            {origen.texto || origen.calle || origen.direccion || viaje.origenDireccion || 'Origen no disponible'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-red-600" />
                          <span className="text-xs text-gray-600 line-clamp-2">
                            {destino.texto || destino.calle || destino.direccion || viaje.destinoDireccion || 'Destino no disponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      {/* Sección de Mejores Conductores - Comentada temporalmente
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h3 className="mb-4 font-semibold text-gray-800">Mejores Conductores</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-4 pb-2 border-b text-xs text-gray-500">
              <div>Imagen</div>
              <div>Conductor</div>
              <div>Calificación</div>
              <div>Acciones</div>
            </div>
            {mejoresConductores.map((conductor, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 items-center"
              >
                <div>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-sm text-red-500">{conductor.nombre}</div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < conductor.calificacion
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-300 text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <button className="text-red-500 hover:text-red-600">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
