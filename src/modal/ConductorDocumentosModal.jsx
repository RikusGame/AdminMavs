import React, { useState } from 'react';
import { Eye, FileText, User, Car } from 'lucide-react';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const DOCUMENT_MAP = {
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
  fotoVehiculo4: 'Foto Vehículo 4'
};

export function ConductorDocumentosModal({ conductor, onClose }) {
  if (!conductor) return null;

  const documentosVehiculo = conductor.documentosVehiculo || {};
  const perfilTaxista = conductor.perfilTaxista || {};
  
  const getVerificadoKey = (key) => {
    const mapping = {
      fotoAntecedentesPenales: 'verificadoAntecedentesPenales',
      fotoCarneIdentidadAnverso: 'verificadoCarneIdentidadAnverso',
      fotoCarneIdentidadReverso: 'verificadoCarneIdentidadReverso',
      fotoConductor: 'verificadoFotoConductor',
      fotoLicenciaConducirAnverso: 'verificadoLicenciaConducirAnverso',
      fotoLicenciaConducirReverso: 'verificadoLicenciaConducirReverso',
      fotoPermisoCirculacion: 'verificadoPermisoCirculacion',
      fotoRevisionTecnica: 'verificadoRevisionTecnica',
      fotoSoat: 'verificadoSoat',
      fotoVehiculo1: 'verificadoFotoVehiculo1',
      fotoVehiculo2: 'verificadoFotoVehiculo2',
      fotoVehiculo3: 'verificadoFotoVehiculo3',
      fotoVehiculo4: 'verificadoFotoVehiculo4'
    };
    return mapping[key];
  };

  const documentosArray = Object.keys(DOCUMENT_MAP)
    .filter(key => documentosVehiculo[key])
    .map(key => ({
      key,
      nombre: DOCUMENT_MAP[key],
      url: documentosVehiculo[key],
      verificado: documentosVehiculo[getVerificadoKey(key)] || false
    }));

  const [verificaciones, setVerificaciones] = useState(
    documentosArray.reduce((acc, doc) => {
      acc[doc.key] = doc.verificado;
      return acc;
    }, {})
  );

  const handleSwitchChange = async (docKey, isChecked) => {
    try {
      const verificadoKey = getVerificadoKey(docKey);
      
      await updateDoc(doc(db, 'taxistas', conductor.id), {
        [`documentosVehiculo.${verificadoKey}`]: isChecked
      });
      
      setVerificaciones(prev => ({
        ...prev,
        [docKey]: isChecked
      }));
    } catch (error) {
      console.error('Error al actualizar verificación:', error);
    }
  };

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
          {documentosArray.length > 0 ? (
            <div className="space-y-3">
              {documentosArray.map((doc) => (
                <div key={doc.key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className='w-5 h-5 text-[#a8d96f]'/>
                      <div>
                        <h4 className="font-medium text-gray-800">{doc.nombre}</h4>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          verificaciones[doc.key] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {verificaciones[doc.key] ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => window.open(doc.url, '_blank')}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <Eye className="w-4 h-4" /> Previsualizar
                      </button>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={verificaciones[doc.key]}
                          onChange={(e) => handleSwitchChange(doc.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a8d96f]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a8d96f]"></div>
                      </label>
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