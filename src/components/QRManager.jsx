import { useState, useEffect } from 'react';
import { db, storage, auth } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Upload, Image as ImageIcon, Trash2, CheckCircle } from 'lucide-react';

export function QRManager() {
  const [qrActual, setQrActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    cargarQRActual();
  }, []);

  const cargarQRActual = async () => {
    try {
      const qrRef = doc(db, "qr_recarga", "activo");
      const qrDoc = await getDoc(qrRef);
      
      if (qrDoc.exists()) {
        setQrActual(qrDoc.data());
        setDescripcion(qrDoc.data().descripcion || '');
        console.log('✅ QR actual cargado:', qrDoc.data());
      } else {
        console.log('⚠️ No existe QR activo');
      }
    } catch (error) {
      console.error('Error al cargar QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    setSelectedFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const subirQR = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona una imagen');
      return;
    }

    if (!descripcion.trim()) {
      alert('Por favor agrega una descripción');
      return;
    }

    setUploading(true);
    try {
      // 1. Eliminar imagen anterior si existe
      if (qrActual?.imageUrl) {
        try {
          const oldImageRef = ref(storage, 'qr_recarga/qr_actual.jpg');
          await deleteObject(oldImageRef);
          console.log('✅ Imagen anterior eliminada');
        } catch (error) {
          console.log('⚠️ No se pudo eliminar imagen anterior:', error);
        }
      }

      // 2. Subir nueva imagen a Storage
      const storageRef = ref(storage, 'qr_recarga/qr_actual.jpg');
      await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(storageRef);
      console.log('✅ Imagen subida a Storage:', imageUrl);

      // 3. Actualizar documento en Firestore
      const qrRef = doc(db, "qr_recarga", "activo");
      const version = (qrActual?.version || 0) + 1;
      
      const qrData = {
        imageUrl: imageUrl,
        descripcion: descripcion.trim(),
        creadoPor: auth.currentUser?.email || 'admin',
        fechaCreacion: qrActual?.fechaCreacion || serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        activo: true,
        version: version
      };

      await setDoc(qrRef, qrData);
      console.log('✅ QR actualizado en Firestore');

      // 4. Actualizar estado
      setQrActual(qrData);
      setSelectedFile(null);
      setPreview(null);

      // Mostrar notificación de éxito
      mostrarNotificacion('QR actualizado exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al subir QR:', error);
      alert('Error al subir el QR: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    const notificacion = document.createElement('div');
    notificacion.className = `fixed top-4 right-4 ${tipo === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-4 rounded-lg shadow-xl z-50 animate-slide-in`;
    notificacion.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="font-semibold">${mensaje}</p>
      </div>
    `;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
      notificacion.style.animation = 'slide-out 0.3s ease-in-out';
      setTimeout(() => notificacion.remove(), 300);
    }, 3000);
  };

  const cancelarSeleccion = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de QR de Recarga</h2>
        {qrActual && (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
            Versión {qrActual.version || 1}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: QR Actual */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">QR Actual</h3>
          
          {qrActual ? (
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <img 
                src={qrActual.imageUrl} 
                alt="QR de Recarga" 
                className="w-full max-w-md mx-auto rounded-lg shadow-md mb-4"
              />
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-semibold">Descripción:</span> {qrActual.descripcion}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Creado por:</span> {qrActual.creadoPor}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Última actualización:</span>{' '}
                  {qrActual.fechaActualizacion?.toDate?.()?.toLocaleString('es-CO') || 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay QR configurado</p>
              <p className="text-gray-400 text-sm mt-1">Sube una imagen para empezar</p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Subir Nuevo QR */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            {qrActual ? 'Actualizar QR' : 'Subir Nuevo QR'}
          </h3>

          <div className="space-y-4">
            {/* Preview de la imagen seleccionada */}
            {preview && (
              <div className="border-2 border-green-500 rounded-lg p-4 relative">
                <button
                  onClick={cancelarSeleccion}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full max-w-md mx-auto rounded-lg"
                />
                <p className="text-center text-sm text-green-600 font-semibold mt-2">
                  ✓ Imagen seleccionada
                </p>
              </div>
            )}

            {/* Input de archivo */}
            {!preview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="qr-upload"
                />
                <label htmlFor="qr-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-semibold mb-1">
                    Click para seleccionar imagen
                  </p>
                  <p className="text-gray-500 text-sm">
                    PNG, JPG o JPEG • Máx 5MB
                  </p>
                </label>
              </div>
            )}

            {/* Campo de descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Escanea este QR para recargar tu billetera con Nequi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={subirQR}
                disabled={!selectedFile || !descripcion.trim() || uploading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {qrActual ? 'Actualizar QR' : 'Subir QR'}
                  </>
                )}
              </button>
              
              {preview && (
                <button
                  onClick={cancelarSeleccion}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">ℹ️ Información:</span> Esta imagen será visible
                para todos los taxistas en la aplicación móvil para que puedan recargar su billetera.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
