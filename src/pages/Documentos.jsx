import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { FileText, CheckCircle, XCircle, Search, Eye, Loader2, Users, Truck } from 'lucide-react';
import { cargarConfiguracion } from '../components/DocumentConfigManager';
import EnableAlert from '../components/EnableAlert';

// NOTA: Este mapa estático se mantiene como fallback si falla la carga de configuración
const DOCUMENT_MAP_FALLBACK = {
  fotoAntecedentesPenales: { name: 'Antecedentes Penales', category: 'General', requerido: true },
  fotoCarneIdentidadAnverso: { name: 'C.I. Anverso', category: 'Identificación', requerido: true },
  fotoCarneIdentidadReverso: { name: 'C.I. Reverso', category: 'Identificación', requerido: true },
  fotoConductor: { name: 'Foto del Conductor', category: 'Identificación', requerido: true },
  fotoLicenciaConducirAnverso: { name: 'Licencia Anverso', category: 'Licencia', requerido: true },
  fotoLicenciaConducirReverso: { name: 'Licencia Reverso', category: 'Licencia', requerido: true },
  fotoPermisoCirculacion: { name: 'Permiso de Circulación', category: 'Vehículo', requerido: true },
  fotoRevisionTecnica: { name: 'Revisión Técnica', category: 'Vehículo', requerido: true },
  fotoSoat: { name: 'SOAT', category: 'Vehículo', requerido: true },
  fotoVehiculo1: { name: 'Foto del Vehículo 1', category: 'Vehículo', requerido: true },
  fotoVehiculo2: { name: 'Foto del Vehículo 2', category: 'Vehículo', requerido: false },
};

const transformDriverData = (driver, documentMap) => {
  const documents = [];
  const vehicleDocs = driver.documentosVehiculo || {};
  const driverProfile = driver.perfilTaxista || {};

  Object.entries(documentMap).forEach(([key, info]) => {
    const url = vehicleDocs[key];
    // Capitalize first letter of the field name: fotoConductor -> FotoConductor
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    const verificationKey = `verificado${capitalizedKey}`;
    const isVerified = vehicleDocs[verificationKey] === true;

    if (url) {
      documents.push({
        id: key,
        name: info.name,
        url: url,
        isVerified: isVerified,
        category: info.category,
      });
    }
  });

  return {
    ...driverProfile,
    uid: driver.id,
    createdAt: driver.createdAt || null,
    documents: documents,
    habilitado: vehicleDocs.habilitado || false,
    vehiculo: {
        marca: vehicleDocs.marca || 'N/A',
        color: vehicleDocs.color || 'N/A',
        modelo: vehicleDocs.modelo || vehicleDocs.model || 'N/A',
        placa: vehicleDocs.placa || vehicleDocs.numeroPlaca || vehicleDocs.plate || 'N/A',
        tipoVehiculo: vehicleDocs.tipoVehiculo || vehicleDocs.tipo || 'N/A',
    }
  };
};


const Documentos = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalUrl, setModalUrl] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [updating, setUpdating] = useState(new Set());
  const [pauseListener, setPauseListener] = useState(false);
  const [documentMap, setDocumentMap] = useState(DOCUMENT_MAP_FALLBACK);
  const [filterApproval, setFilterApproval] = useState('Todos');
  const [isEnableModalOpen, setIsEnableModalOpen] = useState(false);
  const [driverToEnable, setDriverToEnable] = useState(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isEnableAllModalOpen, setIsEnableAllModalOpen] = useState(false);
  const [isEnablingAll, setIsEnablingAll] = useState(false);
  const scrollPositionRef = useRef(null);

  // Restore scroll position after React renders
  useEffect(() => {
    if (scrollPositionRef.current !== null) {
      console.log('🔄 [SCROLL] Restaurando scroll a:', scrollPositionRef.current);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
        console.log('✅ [SCROLL] Scroll restaurado. Posición actual:', window.scrollY);
        scrollPositionRef.current = null;
      });
    }
  });

  // Cargar configuración de documentos al montar el componente
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await cargarConfiguracion();
        if (config && config.success && config.documentos && config.documentos.length > 0) {
          // Convertir array de documentos a mapa
          const map = {};

          config.documentos.filter(doc => doc.activo).forEach(doc => {
            map[doc.id] = {
              name: doc.nombre,
              category: doc.categoria,
              requerido: doc.requerido
            };
          });

          setDocumentMap(map);
          console.log('✅ Configuración de documentos cargada desde Firestore');
        } else {
          console.log('⚠️ Usando configuración fallback de documentos');
          // Asegurar que tenemos la configuración fallback
          setDocumentMap(DOCUMENT_MAP_FALLBACK);
        }
      } catch (error) {
        console.error('❌ Error al cargar configuración de documentos:', error);
        // En caso de error, usar fallback
        setDocumentMap(DOCUMENT_MAP_FALLBACK);
      }
    };
    
    loadConfig();
  }, []);

  const toggleDocumentVerification = async (driverId, docKey, currentState, savedScrollPosition) => {
    const updateKey = `${driverId}-${docKey}`;
    console.log('🔵 [TOGGLE DOC] Iniciando:', { driverId, docKey, currentState, savedScrollPosition });
    
    if (updating.has(updateKey)) {
      console.log('⏸️ [TOGGLE DOC] Ya está actualizando, ignorando');
      return;
    }
    
    // Use the scroll position captured BEFORE the event
    scrollPositionRef.current = savedScrollPosition;
    console.log('💾 [SCROLL] Guardado en:', scrollPositionRef.current);
    
    setUpdating(prev => new Set(prev).add(updateKey));
    setPauseListener(true);
    console.log('⏸️ [LISTENER] PAUSADO');
    
    const newDocState = !currentState;
    
    // Encontrar el conductor y actualizar
    const currentDriver = drivers.find(d => d.uid === driverId);
    if (!currentDriver) {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
      return;
    }
    
    // Actualizar documentos
    const updatedDocs = currentDriver.documents.map(doc => 
      doc.id === docKey ? { ...doc, isVerified: newDocState } : doc
    );
    
    // Verificar si TODOS los documentos OBLIGATORIOS están habilitados
    // Usar la configuración dinámica para determinar cuáles son obligatorios
    const obligatoryDocs = updatedDocs.filter(doc => {
      const docInfo = documentMap[doc.id];
      return docInfo && docInfo.requerido !== false;
    });
    
    const allDocsVerified = obligatoryDocs.length > 0 && obligatoryDocs.every(doc => doc.isVerified);
    
    // Si todos verificados → habilitado true
    // Si alguno NO verificado → habilitado false
    const newHabilitadoState = allDocsVerified;
    
    // Actualizar estado local
    setDrivers(prev => prev.map(driver => 
      driver.uid === driverId 
        ? {
            ...driver,
            documents: updatedDocs,
            habilitado: newHabilitadoState
          }
        : driver
    ));
    console.log('✅ [STATE] Actualizado optimísticamente');
    
    try {
      // Capitalize first letter: fotoConductor -> FotoConductor
      const capitalizedKey = docKey.charAt(0).toUpperCase() + docKey.slice(1);
      const verificadoKey = `verificado${capitalizedKey}`;
      const updates = {
        [`documentosVehiculo.${verificadoKey}`]: newDocState,
        'documentosVehiculo.habilitado': newHabilitadoState
      };
      
      console.log('📤 [FIREBASE] Enviando...');
      await updateDoc(doc(db, 'taxistas', driverId), updates);
      console.log('✅ [FIREBASE] Completado');
    } catch (error) {
      console.error('Error al actualizar verificación:', error);
      // Revertir en caso de error
      setDrivers(prev => prev.map(driver => 
        driver.uid === driverId 
          ? {
              ...driver,
              documents: driver.documents.map(doc => 
                doc.id === docKey ? { ...doc, isVerified: currentState } : doc
              )
            }
          : driver
      ));
    } finally {
      console.log('⏱️ [TIMEOUT] Esperando 100ms...');
      setTimeout(() => {
        setUpdating(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateKey);
          return newSet;
        });
        setPauseListener(false);
        console.log('▶️ [LISTENER] REACTIVADO');
        console.log('📍 [SCROLL] Posición:', window.scrollY);
      }, 100);
    }
  };

  const toggleDriverEnabled = (driverId, currentState, savedScrollPosition) => {
    // Guardar scroll si fue capturado
    if (savedScrollPosition !== undefined) {
      scrollPositionRef.current = savedScrollPosition;
      console.log('💾 [SCROLL] Guardado desde onClick:', scrollPositionRef.current);
    }
    
    // Si deshabilita, no pedir confirmación
    if (currentState === true) {
      executeToggleDriver(driverId, currentState);
      return;
    }
    
    // Si habilita, mostrar confirmación
    const driver = drivers.find(d => d.uid === driverId);
    if (!driver) return;
    
    setDriverToEnable({ id: driverId, nombre: driver.nombre, currentState });
    setIsEnableModalOpen(true);
  };

  const executeToggleDriver = async (driverId, currentState) => {
    const updateKey = `${driverId}-enabled`;
    console.log('🟢 [TOGGLE DRIVER]:', { driverId, currentState, scroll: scrollPositionRef.current });
    
    if (updating.has(updateKey)) {
      console.log('⏸️ [TOGGLE DRIVER] Ya actualizando');
      return;
    }
    
    // Scroll position should already be in scrollPositionRef from toggleDriverEnabled
    if (scrollPositionRef.current === null) {
      scrollPositionRef.current = window.scrollY;
      console.log('💾 [SCROLL] Guardado tardío:', scrollPositionRef.current);
    }
    
    setUpdating(prev => new Set(prev).add(updateKey));
    setPauseListener(true);
    console.log('⏸️ [LISTENER] PAUSADO');
    setIsEnabling(true);
    
    const newEnabledState = !currentState;
    
    // Actualizar estado local: cambiar habilitado Y todos los documentos
    setDrivers(prev => prev.map(driver => 
      driver.uid === driverId 
        ? { 
            ...driver, 
            habilitado: newEnabledState,
            documents: driver.documents.map(doc => ({ 
              ...doc, 
              isVerified: newEnabledState 
            }))
          } 
        : driver
    ));
    
    try {
      // Preparar actualizaciones para Firebase
      const updates = {
        'documentosVehiculo.habilitado': newEnabledState
      };
      
      // Actualizar todos los campos verificado* según el nuevo estado
      Object.keys(documentMap).forEach(key => {
        // Capitalize first letter: fotoConductor -> FotoConductor
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        const verificadoKey = `verificado${capitalizedKey}`;
        updates[`documentosVehiculo.${verificadoKey}`] = newEnabledState;
      });
      
      console.log('📤 [FIREBASE] Enviando...');
      await updateDoc(doc(db, 'taxistas', driverId), updates);
      console.log('✅ [FIREBASE] Completado');
    } catch (error) {
      console.error('Error al actualizar habilitación:', error);
      // Revertir en caso de error
      setDrivers(prev => prev.map(driver => 
        driver.uid === driverId 
          ? { 
              ...driver, 
              habilitado: currentState,
              documents: driver.documents.map(doc => ({ 
                ...doc, 
                isVerified: !newEnabledState 
              }))
            } 
          : driver
      ));
    } finally {
      console.log('⏱️ [TIMEOUT] Esperando 100ms...');
      setTimeout(() => {
        setUpdating(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateKey);
          return newSet;
        });
        setPauseListener(false);
        console.log('▶️ [LISTENER] REACTIVADO');
        setIsEnabling(false);
        console.log('📍 [SCROLL] Posición:', window.scrollY);
      }, 100);
    }
  };

  const handleConfirmEnable = () => {
    executeToggleDriver(driverToEnable.id, driverToEnable.currentState);
    setIsEnableModalOpen(false);
    setDriverToEnable(null);
  };

  const closeEnableModal = () => {
    setIsEnableModalOpen(false);
    setDriverToEnable(null);
  };

  const habilitarTodos = async () => {
    setIsEnablingAll(true);
    setPauseListener(true);
    
    try {
      const configDoc = await getDoc(doc(db, 'configuracion', 'documentos'));
      const loadedDocumentMap = configDoc.exists() 
        ? configDoc.data().documentMap 
        : documentMap;

      const documentFields = Object.keys(loadedDocumentMap);
      
      // Filtrar solo conductores NO habilitados
      const disabledDrivers = drivers.filter(driver => !driver.habilitado);

      const updates = disabledDrivers.map(driver => {
        const updateData = {
          "documentosVehiculo.habilitado": true,
          "estado": "Aprobado"
        };
        
        // Marcar TODOS los documentos como verificados
        documentFields.forEach(field => {
          const capitalizedKey = field.charAt(0).toUpperCase() + field.slice(1);
          const verificadoKey = `verificado${capitalizedKey}`;
          updateData[`documentosVehiculo.${verificadoKey}`] = true;
        });

        return updateDoc(doc(db, "taxistas", driver.uid), updateData);
      });

      await Promise.all(updates);
      console.log('✅ Todos los conductores habilitados y documentos verificados');
    } catch (error) {
      console.error("Error al habilitar todos los conductores:", error);
    } finally {
      setTimeout(() => {
        setIsEnablingAll(false);
        setIsEnableAllModalOpen(false);
        setPauseListener(false);
      }, 100);
    }
  };

  const handleEnableAllClick = () => {
    const disabledCount = drivers.filter(driver => !driver.habilitado).length;
    if (disabledCount === 0) {
      alert('Todos los conductores ya están habilitados');
      return;
    }
    setIsEnableAllModalOpen(true);
  };

  const handleConfirmEnableAll = () => {
    habilitarTodos();
  };

  useEffect(() => {
    const driversCollectionRef = collection(db, 'taxistas');
    const q = query(driversCollectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔔 [SNAPSHOT] Disparado. pauseListener:', pauseListener, 'Scroll:', window.scrollY);
      
      if (pauseListener) {
        console.log('🚫 [SNAPSHOT] IGNORADO - listener pausado');
        return;
      }

      console.log('✅ [SNAPSHOT] Procesando. Docs:', snapshot.size);
      const driversList = [];
      snapshot.forEach((doc) => {
        const data = doc.data() || {};
        
        // Capturar fecha de registro desde perfilTaxista.fechaRegistro
        const fechaRegistro = data.fechaRegistro || data.perfilTaxista?.fechaRegistro;
        let createdAt = null;
        
        if (fechaRegistro) {
          if (fechaRegistro.toDate) {
            // Es un Timestamp de Firestore
            createdAt = fechaRegistro.toDate().toISOString();
          } else if (typeof fechaRegistro === 'string') {
            createdAt = fechaRegistro;
          }
        }
        
        const driverData = { id: doc.id, createdAt, ...data };
        driversList.push(transformDriverData(driverData, documentMap));
      });

      // Ordenar por fecha de creación descendente (más recientes arriba)
      driversList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      console.log('📊 [SNAPSHOT] Lista ordenada:', driversList.length);
      console.log('📍 [SCROLL] Antes de setDrivers:', window.scrollY);
      setDrivers(driversList);
      console.log('📍 [SCROLL] Después de setDrivers:', window.scrollY);
      setLoading(false);
    }, (error) => {
        console.error("Error al cargar documentos:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [pauseListener, documentMap]); 


  const openDocumentModal = (url, name) => {
    setModalUrl(url);
    setModalTitle(name);
  };

  // Función para calcular similitud entre strings
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Coincidencia exacta al inicio
    if (s2.startsWith(s1)) return 100;
    
    // Contiene la búsqueda
    if (s2.includes(s1)) return 50 + (s1.length / s2.length) * 50;
    
    // Similitud por caracteres coincidentes
    let matches = 0;
    for (let char of s1) {
      if (s2.includes(char)) matches++;
    }
    return (matches / s1.length) * 30;
  };

  // Actualizar sugerencias cuando cambia el término de búsqueda
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    
    if (value.trim().length > 0) {
      const searchResults = drivers
        .filter(driver => driver.nombre && driver.nombre !== 'Nombre No Disponible')
        .map(driver => ({
          ...driver,
          similarity: calculateSimilarity(value, driver.nombre || '')
        }))
        .filter(driver => driver.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3); // Solo los 3 mejores resultados
      
      setSuggestions(searchResults);
      setShowSuggestions(searchResults.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (driverName) => {
    setSearchTerm(driverName);
    setShowSuggestions(false);
  };


  const filteredDrivers = drivers.filter(driver => {
    const normalizedSearch = searchTerm.toLowerCase();
    const nameMatch = driver.nombre?.toLowerCase().includes(normalizedSearch);
    const uidMatch = driver.uid?.toLowerCase().includes(normalizedSearch);
    const emailMatch = driver.correo?.toLowerCase().includes(normalizedSearch);

    // Mantener todos los documentos por conductor; filtrar a nivel conductor por aprobación
    const approvalOk = filterApproval === 'Todos' || (filterApproval === 'Pendientes' && driver.documents.some(d => !d.isVerified));

    return (nameMatch || uidMatch || emailMatch) && driver.documents.length > 0 && approvalOk;
  });

  const DocumentCard = ({ doc, onOpen, driverId }) => {
    const docInfo = documentMap[doc.id];
    const isOptional = docInfo?.requerido === false;
    
    return (
      <div className={`p-4 rounded-lg border transition-all
        ${doc.isVerified ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#a8d96f]" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-800">{doc.name}</h4>
                {isOptional && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Opcional
                  </span>
                )}
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {doc.isVerified ? 'Aprobado' : 'Pendiente'}
              </span>
            </div>
          </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onOpen(doc.url, doc.name)} 
            className="flex items-center gap-2 px-3 py-2 bg-[#a8d96f] text-white rounded-lg hover:bg-[#96c55f] transition duration-150 text-sm font-medium shadow-md"
            title="Previsualizar Documento"
          >
            <Eye className="w-4 h-4" /> Ver
          </button>
          
          <label 
            className="relative inline-flex items-center cursor-pointer"
            onClick={(e) => {
              // Capture scroll BEFORE any other processing
              const currentScroll = window.scrollY;
              console.log('🎯 [CLICK] Scroll capturado en onClick:', currentScroll);
              // Prevent default to stop any auto-scroll behavior
              e.preventDefault();
              toggleDocumentVerification(driverId, doc.id, doc.isVerified, currentScroll);
            }}
          >
            <input
              type="checkbox"
              checked={doc.isVerified}
              onChange={(e) => {
                // Prevent onChange from firing since we handle it in onClick
                e.preventDefault();
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a8d96f]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a8d96f]"></div>
          </label>
        </div>
      </div>
    </div>
    );
  };

  const DriverSection = ({ driver }) => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
      
      <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#a8d96f]"/>
              {driver.nombre || 'Nombre No Disponible'}
            </h2>
            <p className="text-sm text-gray-600">{driver.correo}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              driver.habilitado ? 'text-green-600' : 'text-red-600'
            }`}>
              {driver.habilitado ? 'Habilitado' : 'Deshabilitado'}
            </span>
            <label 
              className="relative inline-flex items-center cursor-pointer"
              onClick={(e) => {
                // Capture scroll BEFORE any other processing
                const currentScroll = window.scrollY;
                console.log('🎯 [CLICK DRIVER] Scroll capturado:', currentScroll);
                e.preventDefault();
                toggleDriverEnabled(driver.uid, driver.habilitado, currentScroll);
              }}
            >
              <input
                type="checkbox"
                checked={driver.habilitado}
                onChange={(e) => e.preventDefault()}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a8d96f]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a8d96f]"></div>
            </label>
          </div>
        </div>
        
        <div className="text-left p-1 bg-white rounded-lg border min-w-[220px] sm:w-52 md:w-80 lg:w-96">
          <p className="text-sm font-semibold text-gray-700 flex items-center mb-1">
            <Truck className="w-4 h-4 mr-1" /> {driver.vehiculo.marca || 'N/A'}
          </p>

          <div className="grid grid-cols-[auto_auto_auto] gap-x-0 gap-y-0.5 justify-items-start text-[11px] text-gray-600">
            <div className="pr-1">Color: <span className="font-medium text-gray-700">{driver.vehiculo.color || 'N/A'}</span></div>
            <div className="pr-1">Modelo: <span className="font-medium text-gray-700">{driver.vehiculo.modelo || 'N/A'}</span></div>
            <div className="pr-1">Placa: <span className="font-medium text-gray-700">{String(driver.vehiculo.placa || 'N/A').toUpperCase()}</span></div>
            <div className="pr-1">Tipo: <span className="font-medium text-gray-700">{driver.vehiculo.tipoVehiculo || 'N/A'}</span></div>
            <div className="pr-1">CI: <span className="font-medium text-gray-700">{driver.ci || driver.CI || driver.carnet || 'N/A'}</span></div>
            <div className="pr-1">Género: <span className="font-medium text-gray-700">{driver.genero || driver.sexo || 'N/A'}</span></div>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {driver.documents.length > 0 ? (
            driver.documents.map(doc => (
                <DocumentCard key={doc.id} doc={doc} onOpen={openDocumentModal} driverId={driver.uid} />
            ))
        ) : (
            <p className="text-center text-gray-500 italic p-4">
                No hay documentos para mostrar.
            </p>
        )}
      </div>
    </div>
  );
  

  const DocumentModal = ({ url, title, onClose }) => {
    if (!url) return null;

    return (
      <div 
        className="fixed inset-0 bg-transparent backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-out"
        onClick={onClose}
      >
        <style jsx global>{`
          @keyframes modal-pop-in {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modal-pop-in 0.3s ease-out forwards' }}
        >
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-800">{title}</h2>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <img 
              src={url} 
              alt={`Documento: ${title}`} 
              className="w-full h-auto object-contain rounded-lg"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = "https://placehold.co/800x600/EF4444/FFFFFF?text=Error+al+cargar+documento"; 
              }}
            />
            <p className="mt-4 text-center text-xs text-gray-500">
              URL Fuente: <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 transition duration-150">{url}</a>
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#a8d96f] mr-2" />
        <span className="text-lg text-gray-600">Cargando documentos...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Documentos de Conductores</h1>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-gray-600 mb-6">
            Revisión y verificación de documentos de conductores.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={handleEnableAllClick}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>Habilitar a Todos</span>
            {drivers.filter(d => !d.habilitado).length > 0 && (
              <span className="bg-white text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {drivers.filter(d => !d.habilitado).length}
              </span>
            )}
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => searchTerm && suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-[#a8d96f] focus:ring-[#a8d96f] transition"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            
            {/* Dropdown de sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((driver, index) => (
                  <div
                    key={driver.uid}
                    onClick={() => selectSuggestion(driver.nombre)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{driver.nombre}</p>
                        <p className="text-sm text-gray-500">{driver.correo}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {index + 1}° opción
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select de categoría removido (no funciona correctamente) */}
          <select
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value)}
            className="md:w-56 bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-700 focus:border-[#a8d96f] transition"
          >
            <option value="Todos">Mostrar: Todos</option>
            <option value="Pendientes">Mostrar: Pendientes</option>
          </select>
        </div>
      </div>

      {filteredDrivers.length > 0 ? (
        <div className="space-y-6">
          {filteredDrivers.map(driver => (
            <DriverSection key={driver.uid} driver={driver} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 shadow-sm text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No hay documentos</h2>
          <p className="text-gray-500">No se encontraron documentos que coincidan con los filtros.</p>
        </div>
      )}


      <DocumentModal 
        url={modalUrl} 
        title={modalTitle} 
        onClose={() => setModalUrl(null)} 
      />

      {isEnableModalOpen && driverToEnable && (
        <EnableAlert
          isOpen={isEnableModalOpen}
          onClose={closeEnableModal}
          onConfirm={handleConfirmEnable}
          driverName={driverToEnable.nombre}
          isEnabling={isEnabling}
        />
      )}

      {isEnableAllModalOpen && (
        <EnableAlert
          isOpen={isEnableAllModalOpen}
          onClose={() => setIsEnableAllModalOpen(false)}
          onConfirm={habilitarTodos}
          driverName={`${drivers.filter(d => !d.habilitado).length} conductor${drivers.filter(d => !d.habilitado).length !== 1 ? 'es' : ''}`}
          isEnabling={isEnablingAll}
        />
      )}

    </div>
  );
};

export default Documentos;