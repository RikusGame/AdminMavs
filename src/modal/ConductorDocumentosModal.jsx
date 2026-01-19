import React, { useEffect, useState } from 'react';
import { Eye, FileText, User, Car } from 'lucide-react';
import { cargarConfiguracion } from '../components/DocumentConfigManager';

// Fallback estático por si falla la carga de configuración dinámica
const DOCUMENT_MAP_FALLBACK = {
  fotoAntecedentesPenales: 'Antecedentes Penales',
  fotoCarneIdentidadAnverso: 'C.I. Anverso',
  fotoCarneIdentidadReverso: 'C.I. Reverso',
  fotoConductor: 'Foto del Conductor',
  fotoLicenciaConducirAnverso: 'Licencia Anverso',
  fotoLicenciaConducirReverso: 'Licencia Reverso',
  fotoPermisoCirculacion: 'Permiso de Circulación',
  fotoRevisionTecnica: 'Revisión Técnica',
  fotoSoat: 'SOAT',
  fotoVehiculo1: 'Foto Vehículo 1',
  fotoVehiculo2: 'Foto Vehículo 2',
  fotoVehiculo3: 'Foto Vehículo 3',
  fotoVehiculo4: 'Foto Vehículo 4',
};

export function ConductorDocumentosModal({ conductor, onClose }) {
  if (!conductor) return null;

  const documentosVehiculo = conductor.documentosVehiculo || {};
  const perfilTaxista = conductor.perfilTaxista || {};
  const [configDocs, setConfigDocs] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await cargarConfiguracion();
        if (config && config.success && Array.isArray(config.documentos)) {
          const activos = config.documentos.filter((doc) => doc.activo);
          setConfigDocs(activos);
        } else {
          // Fallback: usar mapa estático
          const fallback = Object.entries(DOCUMENT_MAP_FALLBACK).map(
            ([id, nombre]) => ({ id, nombre, activo: true })
          );
          setConfigDocs(fallback);
        }
      } catch (error) {
        console.error('❌ Error al cargar configuración de documentos:', error);
        const fallback = Object.entries(DOCUMENT_MAP_FALLBACK).map(
          ([id, nombre]) => ({ id, nombre, activo: true })
        );
        setConfigDocs(fallback);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, []);

  // Helper para obtener la key de verificación: fotoConductor -> verificadoFotoConductor
  const getVerificadoKey = (id) => {
    if (!id || typeof id !== 'string') return null;
    const capitalizedKey = id.charAt(0).toUpperCase() + id.slice(1);
    return `verificado${capitalizedKey}`;
  };

  // Construimos el arreglo de documentos a mostrar basado en la configuración
  const documentosArray = configDocs.map((docCfg) => {
    const url = documentosVehiculo[docCfg.id];
    const verificadoKey = getVerificadoKey(docCfg.id);
    const verificadoFlag = verificadoKey
      ? documentosVehiculo[verificadoKey] === true
      : false;

    return {
      key: docCfg.id,
      nombre: docCfg.nombre,
      url,
      // "Aprobado" solo cuando el flag verificado* está en true
      verificado: verificadoFlag,
    };
  });

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
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()} 
        style={{ animation: 'modal-pop-in 0.3s ease-out forwards' }} 
      >
        
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
               <FileText className="w-6 h-6 text-[#a8d96f]"/> Documentos del Conductor
            </h3>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-[#a8d96f]" />
              <div>
                <p className="font-semibold text-gray-800">{perfilTaxista.nombre || 'N/A'}</p>
                <p className="text-sm text-gray-600">{perfilTaxista.correo || 'N/A'}</p>
                <p className="text-xs text-gray-500">{perfilTaxista.telefono || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Car className="w-5 h-5 text-[#a8d96f]" />
              <div>
                <p className="font-semibold text-gray-800">{documentosVehiculo.marca || 'N/A'}</p>
                <p className="text-sm text-gray-600">Color: {documentosVehiculo.color || 'N/A'}</p>
                <p className="text-xs text-gray-500">Asientos: {documentosVehiculo.numeroAsientos || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loadingConfig ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
              Cargando configuración de documentos...
            </div>
          ) : documentosArray.length > 0 ? (
            <div className="space-y-3">
              {documentosArray.map((doc) => (
                <div key={doc.key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className='w-5 h-5 text-[#a8d96f]'/>
                      <div>
                        <h4 className="font-medium text-gray-800">{doc.nombre}</h4>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          doc.verificado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {doc.verificado ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => doc.url && window.open(doc.url, '_blank')}
                        disabled={!doc.url}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                          doc.url
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Eye className="w-4 h-4" /> Previsualizar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                <p className="text-yellow-700 italic">No hay documentos registrados para este conductor.</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#a8d96f] text-white font-medium rounded-lg hover:bg-[#96c55f] transition duration-150 shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}