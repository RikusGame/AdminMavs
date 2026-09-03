import { useState, useEffect } from 'react';
import { db, storage, auth } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Upload, Image as ImageIcon, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function QRManager() {
  const [qrActual, setQrActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [descripcion, setDescripcion] = useState('');

  // Estado de carga de la imagen del QR. Se guarda la URL que YA terminó de
  // cargar (y la que falló) en vez de un booleano suelto: así, cuando la URL
  // cambia después de actualizar, el recuadro vuelve a "cargando" solo y no
  // queda un spinner pegado si la imagen ya estaba en caché.
  const [imgListaUrl, setImgListaUrl] = useState(null);
  const [imgErrorUrl, setImgErrorUrl] = useState(null);
  const [intentoImg, setIntentoImg] = useState(0);

  const urlActual = qrActual?.imageUrl || null;
  // Un documento guardado sin `imageUrl` se trata como imagen fallida: antes
  // caía en <img src={undefined}> y dejaba el recuadro vacío sin explicar nada.
  const imgFallo = urlActual === null || imgErrorUrl === urlActual;
  const imgCargando = !imgFallo && imgListaUrl !== urlActual;

  useEffect(() => {
    cargarQRActual();
  }, []);

  const cargarQRActual = async () => {
    try {
      const qrRef = doc(db, "qr_recarga", "activo");
      const qrDoc = await getDoc(qrRef);

      if (qrDoc.exists()) {
        const data = qrDoc.data();
        setQrActual(data);
        setDescripcion(data.descripcion || '');
      } else {
        console.log('No existe QR activo');
      }
    } catch (error) {
      console.error('Error al cargar QR:', error);
      mostrarNotificacion(`No se pudo cargar el QR actual: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      mostrarNotificacion('El archivo elegido no es una imagen', 'error');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      mostrarNotificacion('La imagen debe pesar menos de 5MB', 'error');
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
      mostrarNotificacion('Elegí una imagen antes de actualizar', 'error');
      return;
    }

    if (!descripcion.trim()) {
      mostrarNotificacion('Agregá una descripción antes de actualizar', 'error');
      return;
    }

    setUploading(true);
    try {
      // Se sube SIEMPRE a la misma ruta y `uploadBytes` la sobrescribe de una.
      // Antes se borraba el archivo anterior ANTES de subir el nuevo, lo que
      // dejaba una ventana en la que el QR no existía en Storage: si en ese
      // momento el navegador volvía a pedir la imagen, el recuadro quedaba en
      // blanco aunque el cambio se guardara bien. Sobrescribir no deja ese hueco.
      const storageRef = ref(storage, 'qr_recarga/qr_actual.jpg');
      await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(storageRef);

      const qrRef = doc(db, "qr_recarga", "activo");
      const version = (qrActual?.version || 0) + 1;

      await setDoc(qrRef, {
        imageUrl: imageUrl,
        descripcion: descripcion.trim(),
        creadoPor: auth.currentUser?.email || 'admin',
        fechaCreacion: qrActual?.fechaCreacion || serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        activo: true,
        version: version
      });

      // Se relee lo que quedó guardado en vez de meter en el estado el objeto
      // que se mandó. `serverTimestamp()` es un centinela, no una fecha: si se
      // dejaba en el estado, "Última actualización" pasaba a mostrar "N/A"
      // justo después de haber guardado bien.
      await cargarQRActual();

      setSelectedFile(null);
      setPreview(null);

      mostrarNotificacion(`QR actualizado exitosamente (versión ${version})`, 'success');
    } catch (error) {
      console.error('Error al subir QR:', error);
      mostrarNotificacion(`No se pudo actualizar el QR: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Reintentar vuelve a leer el documento (por si la URL guardada cambió) y
  // fuerza el remontado del <img> con el contador, para que el navegador pida
  // la imagen de nuevo aunque la URL sea la misma.
  const reintentarImagen = async () => {
    setImgErrorUrl(null);
    setIntentoImg((n) => n + 1);
    await cargarQRActual();
  };

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    const esExito = tipo === 'success';

    const notificacion = document.createElement('div');
    notificacion.setAttribute('role', 'alert');
    notificacion.className = `fixed top-4 right-4 max-w-sm ${esExito ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-4 rounded-lg shadow-xl z-50 animate-slide-in`;

    const fila = document.createElement('div');
    fila.className = 'flex items-center gap-3';
    // Solo el ícono va por innerHTML (es HTML fijo nuestro). El mensaje va por
    // textContent porque puede venir de error.message y no se debe interpretar.
    fila.innerHTML = esExito
      ? '<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
      : '<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';

    const texto = document.createElement('p');
    texto.className = 'font-semibold';
    texto.textContent = mensaje;
    fila.appendChild(texto);

    notificacion.appendChild(fila);
    document.body.appendChild(notificacion);

    // Los errores se quedan más tiempo para poder leerlos.
    setTimeout(() => {
      notificacion.style.animation = 'slide-out 0.3s ease-in-out';
      setTimeout(() => notificacion.remove(), 300);
    }, esExito ? 3000 : 6000);
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
              {/* El recuadro reserva alto fijo: mientras la imagen nueva se
                  descarga se ve un spinner y no un hueco vacío, que es lo que
                  se leía como "la pantalla se queda en blanco". */}
              <div className="relative min-h-48 flex items-center justify-center mb-4">
                {imgFallo ? (
                  <div className="flex flex-col items-center gap-2 text-center py-8">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <p className="text-sm font-semibold text-gray-700">
                      No se pudo mostrar la imagen del QR
                    </p>
                    <p className="text-xs text-gray-500">
                      Los datos del QR sí están guardados. Probá cargarla de nuevo.
                    </p>
                    <button
                      onClick={reintentarImagen}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <>
                    {imgCargando && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        <p className="text-sm text-gray-500">Cargando imagen del QR...</p>
                      </div>
                    )}
                    <img
                      key={`${urlActual}#${intentoImg}`}
                      src={urlActual}
                      alt="QR de Recarga"
                      onLoad={() => setImgListaUrl(urlActual)}
                      onError={() => setImgErrorUrl(urlActual)}
                      className={`w-full max-w-md mx-auto rounded-lg shadow-md ${imgCargando ? 'invisible' : ''}`}
                    />
                  </>
                )}
              </div>
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
                disabled={uploading}
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
                  disabled={uploading}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Aviso mientras se sube, para que no parezca que no pasa nada */}
            {uploading && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 shrink-0"></div>
                <p className="text-sm text-green-800">
                  Subiendo el QR y guardando los cambios. No cierres esta pantalla.
                </p>
              </div>
            )}

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
