import { useState, useEffect } from "react";
import { db, storage } from "../config/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteField,
  getDoc,
  setDoc
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from "firebase/storage";
import { Plus, Edit2, Trash2, Image as ImageIcon, Power, PowerOff } from "lucide-react";
import { CreateServicioModal } from "../modal/CreateServicioModal";
import { EditServicioModal } from "../modal/EditServicioModal";
import DeleteAlert from "../components/DeleteAlert";

export function Servicios() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [mostrarDeleteAlert, setMostrarDeleteAlert] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("La Paz");
  const [ordenDepartamentos, setOrdenDepartamentos] = useState([
    "La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", 
    "Oruro", "Potosí", "Tarija", "Pando", "Beni"
  ]);
  const [departamentoDrag, setDepartamentoDrag] = useState(null);

  // Cargar servicios en tiempo real
  useEffect(() => {
    console.log('🔍 Cargando servicios...');
    const tarifasRef = collection(db, 'empresas', 'mujeresalvolante', 'tarifas');
    
    const unsubscribe = onSnapshot(
      tarifasRef,
      (snapshot) => {
        const items = [];
        
        snapshot.forEach((doc) => {
          const departamento = doc.id;
          const data = doc.data();
          
          // Cada key en el documento es un servicio
          Object.keys(data).forEach((servicioKey) => {
            const servicioData = data[servicioKey];
            if (typeof servicioData === 'object' && servicioData !== null) {
              items.push({
                id: `${departamento}_${servicioKey}`,
                departamento,
                servicioKey,
                nombre: servicioData.servicio || servicioKey,
                activo: servicioData.activo === true,
                logo: servicioData.logo || '',
                icono: servicioData.icono || 'local_taxi',
                tarifas: servicioData.tarifas || {},
                tarifasAeropuerto: servicioData.Tarifas_Aeropuerto || {},
                horasPico: servicioData.Horas_pico || {},
              });
            }
          });
        });

        console.log('✅ Servicios cargados:', items.length);
        setServicios(items);
        setCargando(false);
      },
      (error) => {
        console.error('❌ Error al cargar servicios:', error);
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Cargar orden guardado de localStorage
  useEffect(() => {
    const ordenGuardado = localStorage.getItem('ordenDepartamentosServicios');
    if (ordenGuardado) {
      try {
        setOrdenDepartamentos(JSON.parse(ordenGuardado));
      } catch (error) {
        console.error('Error al cargar orden:', error);
      }
    }
  }, []);

  // Agrupar servicios por departamento
  const serviciosPorDepartamento = servicios.reduce((acc, servicio) => {
    if (!acc[servicio.departamento]) {
      acc[servicio.departamento] = [];
    }
    acc[servicio.departamento].push(servicio);
    return acc;
  }, {});

  // Ordenar departamentos según el orden personalizado
  const departamentos = ordenDepartamentos.filter(dept => serviciosPorDepartamento[dept]);

  // Alternar estado activo/inactivo
  const toggleActivo = async (servicio) => {
    try {
      const docRef = doc(db, 'empresas', 'mujeresalvolante', 'tarifas', servicio.departamento);
      await updateDoc(docRef, {
        [`${servicio.servicioKey}.activo`]: !servicio.activo
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  // Abrir modal de edición
  const handleEditar = async (servicio) => {
    try {
      // Obtener datos completos del servicio
      const docRef = doc(db, 'empresas', 'mujeresalvolante', 'tarifas', servicio.departamento);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const servicioCompleto = {
          ...servicio,
          ...data[servicio.servicioKey]
        };
        setServicioSeleccionado(servicioCompleto);
        setModalEditar(true);
      }
    } catch (error) {
      console.error('Error al cargar servicio:', error);
    }
  };

  // Callback cuando se crea un servicio (abre edición automáticamente)
  const handleServicioCreado = async (nuevoServicio) => {
    try {
      const docRef = doc(db, 'empresas', 'mujeresalvolante', 'tarifas', nuevoServicio.departamento);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const servicioCompleto = {
          departamento: nuevoServicio.departamento,
          servicioKey: nuevoServicio.servicioKey,
          nombre: nuevoServicio.nombre,
          logo: nuevoServicio.logo,
          ...data[nuevoServicio.servicioKey]
        };
        setServicioSeleccionado(servicioCompleto);
        setModalEditar(true);
      }
    } catch (error) {
      console.error('Error al abrir edición:', error);
    }
  };

  // Confirmar eliminación
  const handleEliminarClick = (servicio) => {
    setServicioSeleccionado(servicio);
    setMostrarDeleteAlert(true);
  };

  // Eliminar servicio (de todos los departamentos)
  const handleEliminar = async () => {
    if (!servicioSeleccionado) return;

    setEliminando(true);
    try {
      // Eliminar de todos los departamentos
      const departamentos = ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Pando", "Beni"];
      
      for (const dept of departamentos) {
        const docRef = doc(db, 'empresas', 'mujeresalvolante', 'tarifas', dept);
        try {
          await updateDoc(docRef, {
            [servicioSeleccionado.servicioKey]: deleteField()
          });
        } catch (error) {
          console.warn(`No se pudo eliminar de ${dept}:`, error);
        }
      }

      // Eliminar del catálogo
      try {
        const catalogoRef = doc(db, "servicios_departamentos", "servicios_departamentos");
        const catalogoSnap = await getDoc(catalogoRef);
        
        if (catalogoSnap.exists()) {
          const serviciosActuales = catalogoSnap.data().Servicios || [];
          const serviciosActualizados = serviciosActuales.filter(s => s !== servicioSeleccionado.nombre);
          await updateDoc(catalogoRef, { Servicios: serviciosActualizados });
        }
      } catch (error) {
        console.warn('No se pudo eliminar del catálogo:', error);
      }

      // Si hay logo, intentar eliminarlo de Storage
      if (servicioSeleccionado.logo) {
        try {
          const logoRef = ref(storage, servicioSeleccionado.logo);
          await deleteObject(logoRef);
        } catch (error) {
          console.warn('No se pudo eliminar el logo:', error);
        }
      }

      setMostrarDeleteAlert(false);
      setServicioSeleccionado(null);
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      alert('Error al eliminar el servicio');
    } finally {
      setEliminando(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (dept) => {
    setDepartamentoDrag(dept);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (deptDestino) => {
    if (!departamentoDrag || departamentoDrag === deptDestino) return;

    const indexOrigen = ordenDepartamentos.indexOf(departamentoDrag);
    const indexDestino = ordenDepartamentos.indexOf(deptDestino);

    const nuevoOrden = [...ordenDepartamentos];
    nuevoOrden.splice(indexOrigen, 1);
    nuevoOrden.splice(indexDestino, 0, departamentoDrag);

    setOrdenDepartamentos(nuevoOrden);
    localStorage.setItem('ordenDepartamentosServicios', JSON.stringify(nuevoOrden));
    setDepartamentoDrag(null);
  };

  const handleDragEnd = () => {
    setDepartamentoDrag(null);
  };

  // Obtener icono
  const getIcono = (iconoStr) => {
    const iconMap = {
      'directions_car': '🚗',
      'local_taxi': '🚕',
      'two_wheeler': '🛵',
      'motorcycle': '🏍️',
      'local_shipping': '🚚',
      'airport_shuttle': '🚐',
      'directions_bus': '🚌',
      'pedal_bike': '🚴',
      'sailing': '⛵',
    };
    return iconMap[iconoStr] || '🚗';
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        <p className="text-gray-600 mt-4">Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
          <p className="text-gray-600 mt-1">Gestiona los servicios disponibles por departamento</p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Crear Nuevo Servicio
        </button>
      </div>

      {servicios.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm">
          <div className="text-gray-400 mb-4">
            <ImageIcon className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay servicios registrados</h3>
          <p className="text-gray-500 mb-4">Comienza creando tu primer servicio</p>
          <button
            onClick={() => setModalCrear(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Crear Servicio
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Arrastra los departamentos para reorganizar el orden de visualización
            </p>
          </div>
          
          {departamentos.map((departamento) => (
            <div 
              key={departamento} 
              className={`bg-white rounded-lg p-6 shadow-sm cursor-move transition-all ${
                departamentoDrag === departamento 
                  ? 'opacity-50 scale-95' 
                  : departamentoDrag 
                    ? 'hover:border-2 hover:border-green-500' 
                    : ''
              }`}
              draggable
              onDragStart={() => handleDragStart(departamento)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(departamento)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-green-500">
                <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {departamento}
                </h2>
              </div>
              <div className="grid gap-4">
                {serviciosPorDepartamento[departamento].map((servicio) => (
                  <div
                    key={servicio.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    {/* Logo/Icono */}
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {servicio.logo ? (
                        <img 
                          src={servicio.logo} 
                          alt={servicio.nombre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="text-3xl"
                        style={{ display: servicio.logo ? 'none' : 'flex' }}
                      >
                        {getIcono(servicio.icono)}
                      </div>
                    </div>

                    {/* Nombre */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{servicio.nombre}</h3>
                      <p className="text-sm text-gray-500">
                        Tarifa base: Bs. {servicio.tarifas?.tarifaBase?.toFixed(2) || '0.00'} | 
                        Comisión: {servicio.tarifas?.comision?.toFixed(0) || '0'}%
                      </p>
                    </div>

                    {/* Estado */}
                    <button
                      onClick={() => toggleActivo(servicio)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                        servicio.activo
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {servicio.activo ? (
                        <>
                          <Power className="w-4 h-4" />
                          Activo
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-4 h-4" />
                          Inactivo
                        </>
                      )}
                    </button>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditar(servicio)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        title="Editar servicio"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEliminarClick(servicio)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modalCrear && (
        <CreateServicioModal
          onClose={() => setModalCrear(false)}
          onServicioCreado={handleServicioCreado}
        />
      )}

      {modalEditar && servicioSeleccionado && (
        <EditServicioModal
          servicio={servicioSeleccionado}
          onClose={() => {
            setModalEditar(false);
            setServicioSeleccionado(null);
          }}
        />
      )}

      <DeleteAlert
        isOpen={mostrarDeleteAlert}
        onClose={() => {
          setMostrarDeleteAlert(false);
          setServicioSeleccionado(null);
        }}
        onConfirm={handleEliminar}
        itemName={servicioSeleccionado?.nombre || ''}
        itemType="el servicio"
        isDeleting={eliminando}
      />
    </div>
  );
}
