# Sistema de Billetera - Documentación

## 📋 Resumen

Sistema completo para gestionar la billetera de los taxistas desde el panel de administración React con actualización en tiempo real.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin React Panel                         │
│  (PerfilConductor.jsx + AgregarMontoModal.jsx)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Firestore Database                       │
│                                                              │
│  taxistas/{taxistaId}/                                      │
│    ├── billetera: { saldo, ultimaActualizacion }           │
│    └── billetera/ (subcolección)                           │
│         └── [transaccionId]/                               │
│              ├── tipo: "recarga" | "descuento"             │
│              ├── monto: number                             │
│              ├── saldoAnterior: number                     │
│              ├── saldoNuevo: number                        │
│              ├── metodoPago: string                        │
│              ├── nota: string                              │
│              ├── creadoPor: email                          │
│              ├── fechaCreacion: timestamp                  │
│              └── estado: "completado"                      │
│                                                              │
│  billetera_transacciones/ (colección global)                │
│    └── [transaccionId]/                                    │
│         └── (mismos campos + taxistaId, taxistaNombre)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Actualización en Tiempo Real (Stream)              │
│  - onSnapshot escucha cambios en billetera/                 │
│  - UI se actualiza automáticamente                          │
│  - Indicador "En vivo" muestra estado de conexión          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos

### Admin React

```
src/
├── pages/
│   └── PerfilConductor.jsx      # Perfil del taxista con tabs
├── modal/
│   └── AgregarMontoModal.jsx    # Modal para agregar saldo
└── config/
    └── firebase.js              # Configuración de Firebase
```

## 🚀 Uso Rápido

### Agregar Saldo a un Taxista

1. **Navegar al perfil del conductor**
   - En la página de Conductores, hacer clic en un taxista
   - Se abre el componente `PerfilConductor`

2. **Abrir modal de recarga**
   - Click en "Agregar Monto a la Billetera"
   - Se abre el modal `AgregarMontoModal`

3. **Completar formulario**
   - **Cantidad**: Monto a recargar (ej: 50000)
   - **Método de Pago**: Seleccionar de la lista
     - Recarga Manual (Admin)
     - Transferencia Bancaria
     - Efectivo
     - PSE
     - Tarjeta
     - Nequi
     - Daviplata
     - Otro
   - **Nota**: Opcional, agregar detalles de la transacción

4. **Confirmar recarga**
   - Click en "Submit"
   - El sistema automáticamente:
     - Crea un registro en `taxistas/{id}/billetera/`
     - Crea una copia en `billetera_transacciones/`
     - Actualiza el saldo en `taxistas/{id}/billetera.saldo`
     - Muestra confirmación con el nuevo saldo

### Ver Historial de Transacciones

1. En el perfil del conductor, ir a la tab **"Transacciones de billetera"**
2. Las transacciones se cargan automáticamente en tiempo real
3. Cada transacción muestra:
   - ✅ Monto (con color verde para recargas)
   - 💳 Método de pago
   - 📝 Nota
   - 📅 Fecha y hora
   - 👤 Quién realizó la operación
   - 💰 Saldo anterior → Saldo nuevo

## 🔧 Modelo de Datos

### Documento Principal del Taxista

```javascript
taxistas/{taxistaId} = {
  billetera: {
    saldo: 150000,                      // Saldo actual
    ultimaActualizacion: Timestamp,     // Última modificación
    ultimaTransaccionId: "abc123",      // ID de última transacción local
    ultimaTransaccionGlobalId: "xyz789" // ID en colección global
  },
  perfilTaxista: { ... },
  vehiculo: { ... }
}
```

### Transacción en Subcolección (taxistas/{id}/billetera/)

```javascript
taxistas/{taxistaId}/billetera/{transaccionId} = {
  tipo: "recarga",                   // "recarga" | "descuento" | "retiro"
  monto: 50000,                      // Monto de la transacción
  saldoAnterior: 100000,             // Saldo antes de la transacción
  saldoNuevo: 150000,                // Saldo después de la transacción
  metodoPago: "transferencia",       // Método usado
  nota: "Recarga por transferencia", // Detalles opcionales
  creadoPor: "admin@email.com",      // Email del admin
  creadoPorUid: "abc123xyz",         // UID del admin
  taxistaNombre: "Juan Pérez",       // Nombre del taxista
  fechaCreacion: Timestamp,          // Fecha de creación
  estado: "completado",              // Estado de la transacción
  activo: true                       // Indica si está activa
}
```

### Transacción en Colección Global (billetera_transacciones/)

```javascript
billetera_transacciones/{transaccionGlobalId} = {
  // Todos los campos anteriores +
  taxistaId: "taxista123",           // ID del taxista
  transaccionLocalId: "trans456"     // Referencia a la transacción local
}
```

## 📱 Características

### ✅ En el Modal de Recarga

- **Validación de monto**: Solo acepta valores mayores a 0
- **Selector de método de pago**: 8 opciones predefinidas
- **Campo de notas**: Para agregar detalles de referencia
- **Preview del conductor**: Muestra a quién se le recarga
- **Estados de carga**: Indicador mientras procesa
- **Confirmación**: Alert con resumen de la operación

### ✅ En el Historial de Transacciones

- **Tiempo real**: Stream con `onSnapshot` de Firestore
- **UI rica**: Iconos, colores, badges de estado
- **Información completa**: 
  - Monto con indicador de entrada/salida
  - Método de pago destacado
  - Nota descriptiva
  - Fecha y hora formateadas
  - Usuario que realizó la operación
  - Evolución del saldo (antes → después)
- **Indicador de conexión**: Muestra "En vivo" con animación
- **Sin transacciones**: Mensaje amigable cuando está vacío

### ✅ Seguridad

- **Autenticación**: Solo admins autenticados pueden agregar saldo
- **Trazabilidad**: Cada transacción registra quién la hizo
- **Historial inmutable**: No se pueden eliminar transacciones
- **Doble registro**: En subcolección local y colección global

## 🔄 Flujo de Recarga

```
1. Admin abre modal
   ↓
2. Completa formulario (cantidad, método, nota)
   ↓
3. Submit → Validación
   ↓
4. Obtiene saldo actual del taxista
   ↓
5. Calcula nuevo saldo
   ↓
6. Crea documento en taxistas/{id}/billetera/
   ├── Guarda tipo, monto, saldo anterior/nuevo
   ├── Método de pago, nota, admin que lo hizo
   └── Timestamp automático de Firestore
   ↓
7. Crea copia en billetera_transacciones/
   └── Agrega taxistaId y referencia a transacción local
   ↓
8. Actualiza taxistas/{id}/billetera.saldo
   └── Nuevo saldo + timestamp + IDs de transacciones
   ↓
9. Stream detecta cambio
   ↓
10. UI se actualiza automáticamente
    ├── Saldo en el perfil
    └── Nueva transacción en historial
    ↓
11. Confirmación al admin
    └── Alert con resumen
```

## 🛡️ Reglas de Seguridad (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Colección de taxistas
    match /taxistas/{taxistaId} {
      // Solo admins pueden escribir
      allow write: if request.auth != null && 
                      request.auth.token.rol == 'admin';
      
      // Admins y el propio taxista pueden leer
      allow read: if request.auth != null && (
                     request.auth.token.rol == 'admin' ||
                     request.auth.uid == taxistaId
                  );
      
      // Subcolección billetera
      match /billetera/{transaccionId} {
        // Solo admins pueden crear transacciones
        allow create: if request.auth != null && 
                         request.auth.token.rol == 'admin';
        
        // No se puede editar ni eliminar
        allow update, delete: if false;
        
        // Admins y el propio taxista pueden leer
        allow read: if request.auth != null && (
                       request.auth.token.rol == 'admin' ||
                       request.auth.uid == taxistaId
                    );
      }
    }
    
    // Colección global de transacciones
    match /billetera_transacciones/{transaccionId} {
      // Solo admins pueden crear
      allow create: if request.auth != null && 
                       request.auth.token.rol == 'admin';
      
      // Solo admins pueden leer
      allow read: if request.auth != null && 
                     request.auth.token.rol == 'admin';
      
      // No se puede editar ni eliminar
      allow update, delete: if false;
    }
  }
}
```

## 🐛 Troubleshooting

### El saldo no se actualiza

1. ✅ Verificar que existe `taxistas/{id}/billetera.saldo`
2. ✅ Revisar consola del navegador para errores
3. ✅ Confirmar que el admin está autenticado
4. ✅ Verificar permisos de Firestore

### Las transacciones no aparecen

1. ✅ Ir a la tab "Transacciones de billetera"
2. ✅ Verificar que hay documentos en `taxistas/{id}/billetera/`
3. ✅ Revisar reglas de seguridad de Firestore
4. ✅ Comprobar conexión a internet

### Error al agregar monto

1. ✅ Validar que el monto es mayor a 0
2. ✅ Confirmar autenticación del admin
3. ✅ Revisar configuración de Firebase
4. ✅ Ver errores en consola

### Stream no actualiza en tiempo real

1. ✅ Verificar que `onSnapshot` está activo
2. ✅ Revisar reglas de lectura en Firestore
3. ✅ Confirmar que hay conexión a internet
4. ✅ Recargar la página si es necesario

## 💡 Próximas Mejoras

- [ ] **Retiros de saldo**: Permitir descontar saldo
- [ ] **Filtros**: Por fecha, método de pago, monto
- [ ] **Búsqueda**: Buscar transacciones por nota o ID
- [ ] **Exportar**: Descargar historial en CSV/PDF
- [ ] **Gráficos**: Estadísticas de recargas por período
- [ ] **Notificaciones**: Email/SMS al taxista cuando se recarga
- [ ] **Límites**: Configurar montos mínimos/máximos de recarga
- [ ] **Descuentos automáticos**: Por comisiones de viajes
- [ ] **Reconciliación**: Comparar con pagos reales

## 📊 Estadísticas del Sistema

- ⚡ **Tiempo real**: Actualizaciones instantáneas con `onSnapshot`
- 📦 **Almacenamiento dual**: Local (por taxista) + Global (reportes)
- 🔒 **Seguro**: Trazabilidad completa de cada transacción
- 🎨 **UI moderna**: Componentes React con Tailwind CSS
- ♻️ **Escalable**: Funciona con miles de taxistas
- 📱 **Responsive**: Se adapta a móvil y desktop

## 📚 Código Ejemplo

### Agregar Saldo Programáticamente

```javascript
import { db, auth } from "./config/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

async function recargarBilletera(taxistaId, monto, metodoPago, nota) {
  try {
    const conductorRef = doc(db, "taxistas", taxistaId);
    const conductorSnap = await getDoc(conductorRef);
    
    if (!conductorSnap.exists()) {
      throw new Error('Taxista no encontrado');
    }
    
    const data = conductorSnap.data();
    const saldoActual = data.billetera?.saldo || 0;
    const nuevoSaldo = saldoActual + monto;
    
    // Crear transacción
    const transRef = await addDoc(
      collection(db, "taxistas", taxistaId, "billetera"), 
      {
        tipo: 'recarga',
        monto,
        saldoAnterior: saldoActual,
        saldoNuevo: nuevoSaldo,
        metodoPago,
        nota,
        creadoPor: auth.currentUser?.email || 'sistema',
        fechaCreacion: serverTimestamp(),
        estado: 'completado'
      }
    );
    
    // Actualizar saldo
    await updateDoc(conductorRef, {
      'billetera.saldo': nuevoSaldo,
      'billetera.ultimaActualizacion': serverTimestamp()
    });
    
    console.log('✅ Recarga exitosa:', transRef.id);
    return nuevoSaldo;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Uso
await recargarBilletera('taxista123', 50000, 'transferencia', 'Recarga mensual');
```

### Escuchar Transacciones en Tiempo Real

```javascript
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function escucharTransacciones(taxistaId, callback) {
  const q = query(
    collection(db, "taxistas", taxistaId, "billetera"),
    orderBy("fechaCreacion", "desc")
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const transacciones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(transacciones);
  });
  
  return unsubscribe; // Llamar para detener escucha
}

// Uso
const detener = escucharTransacciones('taxista123', (trans) => {
  console.log('Nuevas transacciones:', trans);
});

// Detener cuando ya no se necesite
detener();
```

## 🎯 Conclusión

Este sistema proporciona una gestión completa de billetera con:
- ✅ Actualización en tiempo real
- ✅ Historial inmutable y trazable
- ✅ UI intuitiva y profesional
- ✅ Seguridad robusta
- ✅ Escalabilidad para miles de usuarios

Para soporte o mejoras, revisar el código en:
- `src/pages/PerfilConductor.jsx`
- `src/modal/AgregarMontoModal.jsx`
