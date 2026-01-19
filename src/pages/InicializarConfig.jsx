/**
 * Página temporal para inicializar la configuración de documentos en Firestore
 * Esta página se puede acceder una vez y luego remover del routing
 */

import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { initDocumentosConfig, verificarConfig } from '../scripts/initDocumentosConfig';

export default function InicializarConfig() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [configInfo, setConfigInfo] = useState(null);

  const handleInitialize = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const res = await initDocumentosConfig();
      setResult(res);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificar = async () => {
    setLoading(true);
    
    try {
      const res = await verificarConfig();
      setConfigInfo(res);
    } catch (error) {
      setConfigInfo({ exists: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Inicializar Configuración de Documentos
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Instrucciones:</strong> Este proceso inicializará la configuración de documentos
              en Firestore con los 11 documentos base del sistema. Solo debe ejecutarse una vez.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVerificar}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Configuración'
              )}
            </button>

            <button
              onClick={handleInitialize}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inicializando...
                </>
              ) : (
                'Inicializar Configuración'
              )}
            </button>
          </div>

          {/* Resultado de inicialización */}
          {result && (
            <div className={`border rounded-lg p-4 ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? '✅ Éxito' : '❌ Error'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message}
                  </p>

                  {result.success && result.data && (
                    <div className="mt-3 space-y-1 text-sm text-green-700">
                      <p>📄 Total documentos: {result.data.documentos.length}</p>
                      <p>📅 Versión: {result.data.version}</p>
                      <p>👤 Inicializado por: {result.data.modificadoPorNombre}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Información de configuración */}
          {configInfo && (
            <div className={`border rounded-lg p-4 ${
              configInfo.exists 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {configInfo.exists ? (
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    configInfo.exists ? 'text-blue-800' : 'text-yellow-800'
                  }`}>
                    {configInfo.exists ? 'Configuración Encontrada' : 'Configuración No Existe'}
                  </p>

                  {configInfo.exists && configInfo.data && (
                    <div className="mt-3 space-y-1 text-sm text-blue-700">
                      <p>📄 Total documentos: {configInfo.data.documentos?.length || 0}</p>
                      <p>📅 Última modificación: {new Date(configInfo.data.ultimaModificacion).toLocaleString()}</p>
                      <p>👤 Modificado por: {configInfo.data.modificadoPorNombre}</p>
                      <p>🔢 Versión: {configInfo.data.version}</p>
                      
                      <div className="mt-3 pt-3 border-t border-blue-300">
                        <p className="font-medium mb-2">Documentos por categoría:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(
                            configInfo.data.documentos.reduce((acc, doc) => {
                              acc[doc.categoria] = (acc[doc.categoria] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([categoria, count]) => (
                            <div key={categoria} className="text-xs bg-blue-100 px-2 py-1 rounded">
                              {categoria}: {count}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {configInfo.error && (
                    <p className="text-sm text-red-700 mt-2">
                      Error: {configInfo.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Una vez inicializada la configuración, puede acceder a la
              página "Gestión de Documentos" desde el menú lateral para administrar los documentos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
