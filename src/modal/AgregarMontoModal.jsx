import { useState } from 'react';
import { X } from 'lucide-react';
import { db, auth } from "../config/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, setDoc, serverTimestamp } from "firebase/firestore";

export function AgregarMontoModal({ isOpen, onClose, conductorNombre, conductorId, onMontoAdded }) {
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cantidad || parseFloat(cantidad) <= 0) {
      alert('Por favor, ingresa un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const conductorRef = doc(db, "taxistas", conductorId);
      
      // Obtener el documento actual del taxista
      const conductorSnapshot = await getDoc(conductorRef);
      if (!conductorSnapshot.exists()) {
        throw new Error('Conductor no encontrado');
      }

      const conductorData = conductorSnapshot.data();
      
      // Leer saldo desde el documento billetera/saldo
      const saldoDocRef = doc(db, "taxistas", conductorId, "billetera", "saldo");
      const saldoDoc = await getDoc(saldoDocRef);
      
      let saldoActual = 0;
      if (saldoDoc.exists()) {
        saldoActual = saldoDoc.data().saldo || 0;
        console.log('📊 Saldo actual desde taxistas/{id}/billetera/saldo:', saldoActual);
      } else {
        console.log('⚠️ Documento saldo no existe, se creará uno nuevo');
      }
      
      const montoAgregar = parseFloat(cantidad);
      const nuevoSaldo = saldoActual + montoAgregar;

      // Obtener información del admin actual
      const adminEmail = auth.currentUser?.email || 'admin@sistema.com';
      const adminUid = auth.currentUser?.uid || 'sistema';

      // 1. Crear documento de transacción en billetera/historial/recargas
      const recargasRef = collection(db, "taxistas", conductorId, "billetera", "historial", "recargas");
      const transaccionData = {
        estado: 'completado',
        fecha: serverTimestamp(),
        metodoPago: 'efectivo',
        monto: montoAgregar,
        notas: nota || 'Recarga registrada desde la app'
      };

      const transaccionRef = await addDoc(recargasRef, transaccionData);
      console.log('✅ Transacción creada en historial/recargas con ID:', transaccionRef.id);

      // 2. Crear una copia en la colección global billetera_transacciones para reportes
      const transaccionGlobalRef = await addDoc(collection(db, "billetera_transacciones"), {
        ...transaccionData,
        taxistaId: conductorId,
        transaccionLocalId: transaccionRef.id
      });
      console.log('✅ Transacción global creada con ID:', transaccionGlobalRef.id);

      // 3. Actualizar el documento billetera/saldo (usar la referencia ya creada)
      await setDoc(saldoDocRef, {
        saldo: nuevoSaldo,
        ultimaActualizacion: serverTimestamp()
      }, { merge: true });
      console.log('✅ Saldo actualizado en taxistas/{id}/billetera/saldo');

      console.log('✅ Monto agregado exitosamente:', { 
        cantidad: montoAgregar, 
        saldoAnterior: saldoActual,
        nuevoSaldo,
        transaccionId: transaccionRef.id,
        transaccionGlobalId: transaccionGlobalRef.id
      });
      
      // Llamar callback para actualizar el estado en el componente padre
      if (onMontoAdded) {
        onMontoAdded(nuevoSaldo);
      }

      // Limpiar formulario
      setCantidad('');
      setNota('');
      onClose();
      
      // Mostrar notificación de éxito mejorada
      const mensajeExito = document.createElement('div');
      mensajeExito.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl z-50 animate-slide-in';
      mensajeExito.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p class="font-bold text-lg">¡Recarga Exitosa!</p>
            <p class="text-sm">Monto: $${montoAgregar.toLocaleString('es-CO')}</p>
            <p class="text-sm">Nuevo saldo: $${nuevoSaldo.toLocaleString('es-CO')}</p>
          </div>
        </div>
      `;
      document.body.appendChild(mensajeExito);
      
      setTimeout(() => {
        mensajeExito.style.animation = 'slide-out 0.3s ease-in-out';
        setTimeout(() => mensajeExito.remove(), 300);
      }, 3000);
    } catch (error) {
      console.error('❌ Error al agregar monto:', error);
      alert('Error al agregar monto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Agregar Monto a la Billetera</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del Conductor */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Recarga para:</p>
            <p className="font-semibold text-gray-800">{conductorNombre}</p>
          </div>

          {/* Campo Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-lg">$</span>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Ingresa el monto a recargar en la billetera</p>
          </div>

          {/* Campo Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
            <textarea 
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Agregar detalles sobre la recarga"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows="3"
            />
          </div>

          {/* Información del método de pago */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💵 Método de pago:</span> Efectivo
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition duration-200"
            >
              Cerrar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black hover:bg-gray-900 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
