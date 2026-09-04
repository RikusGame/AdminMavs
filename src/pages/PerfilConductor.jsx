import { useState, useEffect } from 'react';
import { db, storage } from "../config/firebase";
import { doc, getDoc, updateDoc, collection, query, orderBy, limit, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Mail, Phone, TrendingUp, TrendingDown, MapPin, DollarSign, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { AgregarMontoModal } from "../modal/AgregarMontoModal";
import { LogsCliente } from "../components/LogsCliente";
import { MiniMapaUbicacion } from "../components/MiniMapaUbicacion";

// Radio de despacho de la conductora (tarjeta 1368): hasta qué distancia del
// punto de recogida le llegan solicitudes. El valor va en km y `0` significa
// TODA LA CIUDAD, sin límite. Tiene que coincidir con lo que lee el despacho en
// `functions/index.js` (`radioDespachoDe`), que ante un valor ausente o
// inválido cae a 2 km, que es lo que estaba fijo en el código antes.
const RADIO_DESPACHO_POR_DEFECTO = 2;
const OPCIONES_RADIO_DESPACHO = [
  { valor: 1, etiqueta: "1 km a la redonda" },
  { valor: 2, etiqueta: "2 km a la redonda" },
  { valor: 0, etiqueta: "Toda la ciudad (sin límite)" },
];

// Extrae la ubicación del domicilio de documentosVehiculo. El app la guarda
// como string "Dirección @ lat,lng" (campo del mapa) o como objeto
// {direccion, lat, lng}. Devuelve {direccion, lat, lng} o null.
function extraerDomicilio(vehiculo = {}) {
  const RE = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  for (const [k, v] of Object.entries(vehiculo)) {
    if (v && typeof v === "object" && (v.lat != null || v.direccion)) {
      return {
        direccion: v.direccion || "",
        lat: v.lat ?? v.latitude ?? null,
        lng: v.lng ?? v.longitude ?? null,
      };
    }
    if (typeof v === "string" && v.includes("@")) {
      const m = v.match(RE);
      if (m) {
        return { direccion: v.split("@")[0].trim(), lat: m[1], lng: m[2] };
      }
    }
    if (/domicil|ubicac/i.test(k) && typeof v === "string" && v.trim()) {
      const m = v.match(RE);
      return {
        direccion: m ? v.split("@")[0].trim() : v.trim(),
        lat: m ? m[1] : null,
        lng: m ? m[2] : null,
      };
    }
  }
  return null;
}

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

  // Servicio con el que trabaja (Taxi, Moto taxi...). El despacho filtra por
  // este campo; el admin puede corregirlo desde acá.
  const [serviciosApp, setServiciosApp] = useState([]);
  const [servicioConductor, setServicioConductor] = useState("");
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  // Radio de despacho: hasta qué distancia del punto de recogida le llegan
  // solicitudes. En km; 0 significa toda la ciudad, sin límite. (Tarjeta 1368)
  const [radioDespacho, setRadioDespacho] = useState(RADIO_DESPACHO_POR_DEFECTO);
  const [guardandoRadio, setGuardandoRadio] = useState(false);
  // Departamento de la conductora: el catálogo de servicios depende de él.
  const [departamentoConductor, setDepartamentoConductor] = useState("");
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [falloServicios, setFalloServicios] = useState(false);

  // Mismo criterio que usó la [744] en RegistrarConductorModal: los servicios
  // viven en empresas/mujeresalvolante/tarifas/{departamento}, un documento por
  // departamento con una clave por servicio.
  //
  // Antes esto leía `servicios` con where("activo","==",true). Esa colección es
  // herencia de Chasky, en MAV nadie la escribe nunca y en producción tiene
  // CERO documentos — así que este dropdown salía siempre vacío y no se podía
  // asignar ni corregir el servicio de una conductora. (Tarjeta [1122])
  //
  // Es la MISMA fuente de la que la app le muestra los servicios a la
  // conductora y a la pasajera. Importa que sea la misma: el despacho compara
  // los dos strings con `!==` (functions/index.js:379), así que si salieran de
  // listas distintas la conductora dejaría de recibir órdenes sin que nada
  // falle a la vista.
  useEffect(() => {
    if (!departamentoConductor) {
      setServiciosApp([]);
      return;
    }

    let cancelado = false;
    (async () => {
      setCargandoServicios(true);
      setFalloServicios(false);
      try {
        const snap = await getDoc(
          doc(db, "empresas", "mujeresalvolante", "tarifas", departamentoConductor)
        );
        const data = snap.exists() ? snap.data() : {};

        // Cada clave del doc es un servicio; el resto de los campos no son
        // objetos y se descartan solos.
        const lista = Object.entries(data)
          .filter(
            ([, v]) => typeof v === "object" && v !== null && v.activo === true
          )
          .map(([clave, v], i) => ({
            id: clave,
            // `v.servicio` es el nombre visible y es EL VALOR QUE SE GUARDA.
            // Ojo: no coincide con la clave — por ejemplo la clave
            // `mujeres_al_volante` tiene servicio "TRANSPORTE SEGURO", que es
            // justamente lo que traen las órdenes reales.
            nombre: v.servicio || clave,
            orden: v.orden === undefined || v.orden === null ? i : Number(v.orden),
          }))
          .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

        if (cancelado) return;
        setServiciosApp(lista);
      } catch (e) {
        if (!cancelado) {
          setServiciosApp([]);
          setFalloServicios(true);
        }
        console.error("Error cargando servicios:", e);
      } finally {
        if (!cancelado) setCargandoServicios(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [departamentoConductor]);

  const cambiarServicio = async (nombre) => {
    if (!conductorId) return;
    const anterior = servicioConductor;
    setServicioConductor(nombre);
    setGuardandoServicio(true);
    try {
      await updateDoc(doc(db, "taxistas", conductorId), {
        "documentosVehiculo.servicioSeleccionado": nombre,
      });
    } catch (e) {
      console.error("Error guardando servicio:", e);
      setServicioConductor(anterior);
      alert("No se pudo guardar el servicio: " + (e.message || e));
    } finally {
      setGuardandoServicio(false);
    }
  };

  const cambiarRadioDespacho = async (km) => {
    if (!conductorId) return;
    const anterior = radioDespacho;
    setRadioDespacho(km);
    setGuardandoRadio(true);
    try {
      await updateDoc(doc(db, "taxistas", conductorId), {
        "documentosVehiculo.radioDespachoKm": km,
      });
    } catch (e) {
      console.error("Error guardando radio de despacho:", e);
      setRadioDespacho(anterior);
      alert("No se pudo guardar el radio de despacho: " + (e.message || e));
    } finally {
      setGuardandoRadio(false);
    }
  };

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
          const vehiculo = data.documentosVehiculo || data.vehiculo || {};

          // Intentar obtener el teléfono desde múltiples posibles campos
          const telefonoConductor =
            perfil.telefono ||
            data.telefono ||
            data.celular ||
            data.phone ||
            "N/A";
          
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
          
          // Prioridad: FotoPerfil > fotoPerfil > fotoPerfil del root > photoURL del provider
          let foto = perfil.FotoPerfil || perfil.fotoPerfil || data.fotoPerfil || data.photoURL || null;

          console.log(`📸 Foto original para ${perfil.nombre}:`, foto);

          // Si existe el campo pero no es una URL completa, intentar obtener downloadURL desde Storage
          if (foto && typeof foto === 'string' && !foto.startsWith('http')) {
            try {
              const url = await getDownloadURL(storageRef(storage, foto));
              console.log(`✅ URL resuelta desde Storage:`, url);
              foto = url;
            } catch (err) {
              console.warn(`⚠️ No se pudo resolver foto desde Storage:`, err.message || err);
            }
          }
          
          setConductor({
  id: conductorSnapshot.id,
  nombre: perfil.nombre || "Nombre No Disponible",
  email: perfil.correo || "Correo No Disponible",
  telefono: telefonoConductor,
  fotoPerfilUrl: foto,
  habilitado: data.habilitado || vehiculo.habilitado || false,
  saldo: saldoActual,
  servicioSeleccionado: vehiculo.servicioSeleccionado || "",
  viajes: data.viajes || 0,
  calificacion: data.calificacion || 0,
  reglasAuto: data.reglasAuto || [],
  domicilio: extraerDomicilio(vehiculo),

  vehiculo: {
    marca: vehiculo.marca || "N/A",
    color: vehiculo.color || "N/A",
    modelo: vehiculo.modelo || vehiculo.model || "N/A",
    placa: vehiculo.placa || vehiculo.numeroPlaca || vehiculo.plate || "N/A",
    tipoVehiculo: vehiculo.tipoVehiculo || vehiculo.tipo || "N/A",
  },
});
          setServicioConductor(vehiculo.servicioSeleccionado || "");
          // Mismo criterio que el despacho: si no hay valor válido guardado,
          // rige el por defecto. (Tarjeta 1368)
          setRadioDespacho(
            typeof vehiculo.radioDespachoKm === "number" &&
              vehiculo.radioDespachoKm >= 0
              ? vehiculo.radioDespachoKm
              : RADIO_DESPACHO_POR_DEFECTO
          );
          // El catálogo de servicios depende del departamento. (Tarjeta [1122])
          setDepartamentoConductor(vehiculo.departamentoServicio || "");
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
                {conductor.fotoPerfilUrl && conductor.fotoPerfilUrl.trim() !== '' ? (
                  <img 
                    src={conductor.fotoPerfilUrl} 
                    alt={conductor.nombre}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const placeholder = e.target.nextElementSibling;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                {!conductor.fotoPerfilUrl || conductor.fotoPerfilUrl.trim() === '' ? (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg bg-green-500">
                    {conductor.nombre.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg bg-green-500" style={{ display: 'none' }}>
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

  {conductor.vehiculo?.marca && conductor.vehiculo.marca !== "N/A" ? (
    <div className="bg-white border rounded-xl p-3 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 flex items-center mb-2">
        {conductor.vehiculo.marca}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-gray-600">
        <div>
          Color:{" "}
          <span className="font-medium text-gray-700">
            {conductor.vehiculo.color || "N/A"}
          </span>
        </div>

        <div>
          Modelo:{" "}
          <span className="font-medium text-gray-700">
            {conductor.vehiculo.modelo || "N/A"}
          </span>
        </div>

        <div>
          Tipo:{" "}
          <span className="font-medium text-gray-700">
            {conductor.vehiculo.tipoVehiculo || "N/A"}
          </span>
        </div>

        <div>
          Placa:{" "}
          <span className="font-medium text-gray-700 uppercase">
            {String(conductor.vehiculo.placa || "N/A")}
          </span>
        </div>
      </div>
    </div>
  ) : (
    <p className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg">
      No se encontró información del vehículo
    </p>
  )}
</div>

              {/* Servicio con el que trabaja (filtra el despacho de carreras) */}
              <div className="border-t mt-4 pt-4">
                <h3 className="font-bold text-gray-800 mb-2">Servicio</h3>
                {!servicioConductor && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                    ⚠️ Sin servicio asignado: recibe solicitudes de TODOS los
                    servicios sin filtrar.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={servicioConductor}
                    onChange={(e) => cambiarServicio(e.target.value)}
                    disabled={guardandoServicio || serviciosApp.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm disabled:opacity-60"
                  >
                    <option value="">Sin servicio asignado</option>
                    {serviciosApp.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                    {servicioConductor &&
                      !serviciosApp.some((s) => s.nombre === servicioConductor) && (
                        <option value={servicioConductor}>
                          {servicioConductor} (inactivo)
                        </option>
                      )}
                  </select>
                  {guardandoServicio && (
                    <span className="text-xs text-gray-400 shrink-0">
                      Guardando...
                    </span>
                  )}
                </div>
              </div>

              {/* Radio de despacho: hasta qué distancia le llegan solicitudes.
                  Antes era un 2 km fijo en el código. (Tarjeta 1368) */}
              <div className="border-t mt-4 pt-4">
                <h3 className="font-bold text-gray-800 mb-2">
                  Radio de despacho
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  Hasta qué distancia del punto de recogida le llegan
                  solicitudes. Un radio chico puede dejarla sin carreras.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={radioDespacho}
                    onChange={(e) =>
                      cambiarRadioDespacho(Number(e.target.value))
                    }
                    disabled={guardandoRadio}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm disabled:opacity-60"
                  >
                    {OPCIONES_RADIO_DESPACHO.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.etiqueta}
                      </option>
                    ))}
                    {!OPCIONES_RADIO_DESPACHO.some(
                      (o) => o.valor === radioDespacho
                    ) && (
                      <option value={radioDespacho}>
                        {radioDespacho} km (valor personalizado)
                      </option>
                    )}
                  </select>
                  {guardandoRadio && (
                    <span className="text-xs text-gray-400 shrink-0">
                      Guardando...
                    </span>
                  )}
                </div>
                {/* Los tres motivos por los que el dropdown puede estar vacío
                    llevan a acciones distintas, así que se distinguen.
                    (Tarjeta [1122]) */}
                {!departamentoConductor && (
                  <p className="text-xs text-gray-500 mt-2">
                    Esta conductora no tiene departamento cargado en sus
                    documentos del vehículo, y los servicios se configuran por
                    departamento.
                  </p>
                )}
                {departamentoConductor && cargandoServicios && (
                  <p className="text-xs text-gray-500 mt-2">
                    Cargando servicios de {departamentoConductor}…
                  </p>
                )}
                {departamentoConductor && !cargandoServicios && falloServicios && (
                  <p className="text-xs text-red-600 mt-2">
                    No se pudieron cargar los servicios. Recargá la página.
                  </p>
                )}
                {departamentoConductor &&
                  !cargandoServicios &&
                  !falloServicios &&
                  serviciosApp.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      No hay servicios activos en {departamentoConductor}.
                      Activalos desde la sección Servicios.
                    </p>
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

      {/* Ubicación del domicilio (marcada en el mapa al registrarse) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-700">
            Ubicación del domicilio
          </span>
        </div>
        {conductor?.domicilio ? (
          <>
            {conductor.domicilio.direccion && (
              <p className="text-sm text-gray-700 mb-2">
                {conductor.domicilio.direccion}
              </p>
            )}
            {conductor.domicilio.lat && conductor.domicilio.lng ? (
              <>
                <MiniMapaUbicacion
                  lat={conductor.domicilio.lat}
                  lng={conductor.domicilio.lng}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {conductor.domicilio.lat}, {conductor.domicilio.lng}
                </p>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                Sin coordenadas registradas.
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-400">
            El conductor no marcó su domicilio en el mapa.
          </span>
        )}
      </div>

      {/* Reglas del auto (las que el conductor eligió que aplican) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-700">
            Reglas del auto
          </span>
        </div>
        {Array.isArray(conductor?.reglasAuto) && conductor.reglasAuto.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {conductor.reglasAuto.map((r, i) => (
              <span
                key={r.id || i}
                className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200"
              >
                {r.titulo || r.id || String(r)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">
            El conductor no marcó reglas para su auto.
          </span>
        )}
      </div>

      {/* Logs / Actividad del conductor */}
      <LogsCliente uid={conductorId} />

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
