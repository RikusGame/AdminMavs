import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { getFunctions, httpsCallable } from "firebase/functions";

// `crypto.randomUUID` sólo existe en contexto seguro (https o localhost). El
// panel corre en https, pero si algún día se sirve por http plano esto tiraría
// "randomUUID is not a function" y rompería el crédito entero — peor que el bug
// que estamos arreglando. El respaldo usa getRandomValues, que ya se usa en
// utils/password.js. El formato coincide con el que valida la function:
// [A-Za-z0-9_-]{8,64}.
function nuevaOperacionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function AgregarMontoModal({ isOpen, onClose, conductorNombre, conductorId, onMontoAdded }) {
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  // Clave de idempotencia del crédito. (Tarjeta [1008])
  //
  // Va en un ref y NO en el cuerpo del handler: si se generara en cada click,
  // cada reintento mandaría una clave distinta y no serviría de nada. Acá se
  // genera una vez, se conserva mientras la operación no haya terminado bien, y
  // recién se limpia al acreditar con éxito.
  //
  // Con eso, los tres casos quedan cubiertos:
  //   doble click            -> misma clave, el servidor acredita una sola vez
  //   reintento tras error   -> misma clave, no duplica lo que quizá sí entró
  //   segundo crédito a la
  //   misma persona, a mano  -> clave nueva, acredita de verdad (es legítimo)
  //
  // El último caso es la razón por la que la clave la genera el panel y no se
  // deriva de los datos: acreditarle dos veces lo mismo a la misma conductora
  // el mismo día es una operación válida, no un duplicado.
  const operacionIdRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cantidad || parseFloat(cantidad) <= 0) {
      alert('Por favor, ingresa un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const montoAgregar = parseFloat(cantidad);

      // El saldo lo mueve la Cloud Function `acreditarRecarga` (tarjeta [977]).
      // Antes esto se hacía acá con tres escrituras sueltas y SIN transacción:
      // leer el saldo, crear el movimiento, y reescribir el saldo con
      // `saldoActual + monto`. Si entraba una comisión en el medio, se perdía;
      // y si fallaba la última escritura, quedaba el movimiento en el historial
      // sin haber acreditado nada. Ahora el servidor valida que quien llama sea
      // admin y aplica todo con FieldValue.increment() dentro de una única
      // transacción.
      // Se reutiliza la clave si ya había una de un intento anterior que no
      // llegó a confirmarse.
      if (!operacionIdRef.current) {
        operacionIdRef.current = nuevaOperacionId();
      }

      const functions = getFunctions(undefined, "us-central1");
      const acreditarRecarga = httpsCallable(functions, "acreditarRecarga");
      const { data } = await acreditarRecarga({
        uid: conductorId,
        tipoUsuario: "taxista",
        monto: montoAgregar,
        metodoPago: "efectivo",
        notas: nota || "",
        operacionId: operacionIdRef.current,
      });

      // Acreditado (o ya estaba acreditado): la operación terminó, así que el
      // próximo crédito arranca con una clave nueva.
      operacionIdRef.current = null;

      // `duplicada: true` significa que esta misma operación ya se había
      // acreditado. Para la admin es un éxito, no un error: el saldo está bien.
      // Mostrarle un error la llevaría a intentar de nuevo, que es justo lo que
      // queremos evitar.
      const nuevoSaldo = data?.saldo ?? 0;

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
