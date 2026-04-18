import { useState, useEffect } from "react";
import { db, storage } from "../config/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteField,
  getDoc,
} from "firebase/firestore";
import {
  ref,
  deleteObject,
} from "firebase/storage";
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Power,
  PowerOff,
} from "lucide-react";
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

  // ✅ Nuevo estado para drag de servicios
  const [servicioDrag, setServicioDrag] = useState(null);

  // Cargar servicios en tiempo real
  useEffect(() => {
    console.log('🔍 Cargando servicios...');
    const tarifasRef = collection(db, 'empresas', 'mujeresalvolante', 'tarifas');

    const unsubscribe = onSnapshot(
      tarifasRef,
      (snapshot) => {
        const items = [];

        snapshot.forEach((docSnap) => {
          const departamento = docSnap.id;
          const data = docSnap.data();

          Object.keys(data).forEach((servicioKey, index) => {
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
                orden:
                  servicioData.orden !== undefined && servicioData.orden !== null
                    ? String(servicioData.orden)
                    : String(index),
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
  const departamentos = ordenDepartamentos.filter((dept) => serviciosPorDepartamento[dept]);

  // ✅ Obtener servicios ordenados por atributo "orden"
  const getServiciosOrdenados = (departamento) => {
    const lista = serviciosPorDepartamento[departamento] || [];
    return [...lista].sort((a, b) => {
      const ordenA = Number(a.orden ?? 999999);
      const ordenB = Number(b.orden ?? 999999);
      return ordenA - ordenB;
    });
  };

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

  // Drag & Drop handlers para departamentos
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

  // ✅ Drag & Drop handlers para servicios
  const handleServicioDragStart = (e, servicio) => {
    e.stopPropagation();
    setServicioDrag(servicio);
  };

  const handleServicioDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleServicioDrop = async (e, servicioDestino) => {
    e.preventDefault();
    e.stopPropagation();

    if (!servicioDrag) return;
    if (servicioDrag.id === servicioDestino.id) return;
    if (servicioDrag.departamento !== servicioDestino.departamento) return;

    const departamento = servicioDestino.departamento;
    const listaActual = getServiciosOrdenados(departamento);

    const indexOrigen = listaActual.findIndex((s) => s.id === servicioDrag.id);
    const indexDestino = listaActual.findIndex((s) => s.id === servicioDestino.id);

    if (indexOrigen === -1 || indexDestino === -1) {
      setServicioDrag(null);
      return;
    }

    const nuevaLista = [...listaActual];
    const [servicioMovido] = nuevaLista.splice(indexOrigen, 1);
    nuevaLista.splice(indexDestino, 0, servicioMovido);

    // ✅ Actualización optimista local
    setServicios((prev) =>
      prev.map((serv) => {
        if (serv.departamento !== departamento) return serv;
        const nuevoIndex = nuevaLista.findIndex((item) => item.id === serv.id);
        if (nuevoIndex === -1) return serv;
        return { ...serv, orden: String(nuevoIndex) };
      })
    );

    try {
      const docRef = doc(db, 'empresas', 'mujeresalvolante', 'tarifas', departamento);

      const updates = {};
      nuevaLista.forEach((serv, index) => {
        updates[`${serv.servicioKey}.orden`] = String(index);
      });

      await updateDoc(docRef, updates);
      console.log(`✅ Orden de servicios actualizado en ${departamento}`);
    } catch (error) {
      console.error('❌ Error al actualizar orden de servicios:', error);
      alert('Error al guardar el nuevo orden de servicios');
    } finally {
      setServicioDrag(null);
    }
  };

  const handleServicioDragEnd = (e) => {
    e.stopPropagation();
    setServicioDrag(null);
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
              💡 <strong>Tip:</strong> Arrastra los departamentos para reorganizar el orden de visualización y arrastra los servicios dentro de cada departamento para cambiar su orden.
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
                {getServiciosOrdenados(departamento).map((servicio) => (
                  <div
                    key={servicio.id}
                    draggable
                    onDragStart={(e) => handleServicioDragStart(e, servicio)}
                    onDragOver={handleServicioDragOver}
                    onDrop={(e) => handleServicioDrop(e, servicio)}
                    onDragEnd={handleServicioDragEnd}
                    className={`flex items-center gap-4 p-4 rounded-lg transition cursor-move ${
                      servicioDrag?.id === servicio.id
                        ? 'bg-green-50 opacity-50 scale-[0.98]'
                        : servicioDrag && servicioDrag.departamento === departamento
                          ? 'bg-gray-50 hover:bg-green-50 hover:border hover:border-green-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {/* Arrastre */}
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                      </svg>
                    </div>

                    

                    {/* Logo/Icono */}
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {servicio.logo ? (
                        <>
                          <img
                            src={servicio.logo}
                            alt={servicio.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div
                            className="text-3xl"
                            style={{ display: 'none' }}
                          >
                            {getIcono(servicio.icono)}
                          </div>
                        </>
                      ) : (
                        <div className="text-3xl">
                          {getIcono(servicio.icono)}
                        </div>
                      )}
                    </div>

                    {/* Nombre */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{servicio.nombre}</h3>
                      <p className="text-sm text-gray-500">
                        Tarifa base: Bs. {servicio.tarifas?.tarifaBase?.toFixed(2) || '0.00'} | Comisión: {servicio.tarifas?.comision?.toFixed(0) || '0'}%
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