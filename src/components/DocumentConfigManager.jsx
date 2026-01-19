/**
 * DocumentConfigManager - Gestor de configuración de documentos
 * Maneja CRUD, exportar/importar y auditoría de documentos
 */

import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';

const CONFIG_DOC_PATH = 'configuracion/documentosRegistro';

/**
 * Carga la configuración de documentos desde Firestore
 */
export async function cargarConfiguracion() {
  try {
    const configRef = doc(db, 'configuracion', 'documentosRegistro');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
      console.warn('⚠️ Configuración no encontrada en Firestore');
      return { 
        success: false, 
        message: 'Configuración no existe. Debe inicializarla desde la página de Inicializar Config.', 
        documentos: [] 
      };
    }
    
    const data = configSnap.data();
    
    // Validar que tenga documentos
    if (!data || !data.documentos || !Array.isArray(data.documentos)) {
      console.warn('⚠️ Configuración sin documentos válidos');
      return { 
        success: false, 
        message: 'Configuración inválida', 
        documentos: [] 
      };
    }
    
    return { 
      success: true, 
      documentos: data.documentos,
      metadata: {
        version: data.version,
        ultimaModificacion: data.ultimaModificacion,
        modificadoPor: data.modificadoPorNombre
      }
    };
  } catch (error) {
    console.error('❌ Error al cargar configuración:', error);
    return { 
      success: false, 
      message: error.message || 'Error desconocido', 
      documentos: [] 
    };
  }
}

/**
 * Guarda la configuración completa de documentos
 */
async function guardarConfiguracion(documentos, adminUID, adminNombre) {
  try {
    const configRef = doc(db, 'configuracion', 'documentosRegistro');
    
    const configData = {
      documentos: documentos,
      version: '1.0',
      ultimaModificacion: new Date().toISOString(),
      modificadoPor: adminUID,
      modificadoPorNombre: adminNombre
    };
    
    await setDoc(configRef, configData);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Registra un cambio en el historial de auditoría
 */
async function registrarEnHistorial(accion, documentoAfectado, cambiosRealizados, adminUID, adminNombre) {
  try {
    const historialRef = collection(db, 'configuracion', 'documentosRegistro', 'historial');
    
    const registroHistorial = {
      timestamp: new Date().toISOString(),
      adminUID: adminUID,
      adminNombre: adminNombre,
      accion: accion, // crear|modificar|eliminar|restaurar|reordenar|importar|exportar
      documentoAfectado: documentoAfectado,
      cambiosRealizados: cambiosRealizados || null
    };
    
    await addDoc(historialRef, registroHistorial);
    console.log(`📝 Historial registrado: ${accion}`);
  } catch (error) {
    console.error('⚠️ Error al registrar en historial:', error);
  }
}

/**
 * Crea un nuevo documento
 */
export async function createDocument(documentData, adminUID, adminNombre) {
  try {
    // Cargar configuración actual
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const documentos = config.documentos;
    
    // Validar que no exista el ID
    const existeID = documentos.some(doc => doc.id === documentData.id);
    if (existeID) {
      return { success: false, message: 'Ya existe un documento con ese ID' };
    }
    
    // Validar que el nombre no esté duplicado
    const existeNombre = documentos.some(doc => 
      doc.nombre.toLowerCase() === documentData.nombre.toLowerCase() && doc.activo
    );
    if (existeNombre) {
      return { success: false, message: 'Ya existe un documento con ese nombre' };
    }
    
    // Generar ID único si no se proporcionó
    if (!documentData.id) {
      const timestamp = Date.now();
      const categoriaSlug = documentData.categoria.replace(/\s+/g, '').toLowerCase();
      documentData.id = `doc_${categoriaSlug}_${timestamp}`;
    }
    
    // Agregar metadata
    const nuevoDocumento = {
      ...documentData,
      activo: true,
      esBase: false,
      fechaCreacion: new Date().toISOString()
    };
    
    // Agregar a la lista
    documentos.push(nuevoDocumento);
    
    // Guardar configuración actualizada
    const resultado = await guardarConfiguracion(documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'crear',
        { id: nuevoDocumento.id, nombre: nuevoDocumento.nombre, esBase: false },
        { documentoCreado: nuevoDocumento },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Documento creado: ${nuevoDocumento.nombre}`);
      return { success: true, documento: nuevoDocumento };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al crear documento:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Actualiza un documento existente
 */
export async function updateDocument(docId, cambios, adminUID, adminNombre) {
  try {
    // Cargar configuración actual
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const documentos = config.documentos;
    
    // Encontrar el documento
    const index = documentos.findIndex(doc => doc.id === docId);
    if (index === -1) {
      return { success: false, message: 'Documento no encontrado' };
    }
    
    const estadoAnterior = { ...documentos[index] };
    
    // Aplicar cambios
    documentos[index] = {
      ...documentos[index],
      ...cambios,
      fechaModificacion: new Date().toISOString()
    };
    
    // Guardar configuración actualizada
    const resultado = await guardarConfiguracion(documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'modificar',
        { id: docId, nombre: documentos[index].nombre, esBase: documentos[index].esBase },
        { estadoAnterior, estadoNuevo: documentos[index] },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Documento actualizado: ${documentos[index].nombre}`);
      return { success: true, documento: documentos[index] };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al actualizar documento:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Elimina (desactiva) un documento
 */
export async function deleteDocument(docId, adminUID, adminNombre) {
  try {
    // Cargar configuración actual
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const documentos = config.documentos;
    
    // Encontrar el documento
    const index = documentos.findIndex(doc => doc.id === docId);
    if (index === -1) {
      return { success: false, message: 'Documento no encontrado' };
    }
    
    const documento = documentos[index];
    
    // Marcar como inactivo (eliminación lógica)
    documentos[index] = {
      ...documento,
      activo: false,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: adminNombre
    };
    
    // Guardar configuración actualizada
    const resultado = await guardarConfiguracion(documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'eliminar',
        { id: docId, nombre: documento.nombre, esBase: documento.esBase },
        { documentoEliminado: documento },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Documento eliminado: ${documento.nombre}`);
      return { success: true, documento: documentos[index] };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al eliminar documento:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Restaura un documento eliminado
 */
export async function restoreDocument(docId, adminUID, adminNombre) {
  try {
    // Cargar configuración actual
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const documentos = config.documentos;
    
    // Encontrar el documento
    const index = documentos.findIndex(doc => doc.id === docId);
    if (index === -1) {
      return { success: false, message: 'Documento no encontrado' };
    }
    
    const documento = documentos[index];
    
    if (documento.activo) {
      return { success: false, message: 'El documento ya está activo' };
    }
    
    // Reactivar documento
    documentos[index] = {
      ...documento,
      activo: true,
      fechaRestauracion: new Date().toISOString(),
      restauradoPor: adminNombre
    };
    
    // Guardar configuración actualizada
    const resultado = await guardarConfiguracion(documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'restaurar',
        { id: docId, nombre: documento.nombre, esBase: documento.esBase },
        { documentoRestaurado: documento },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Documento restaurado: ${documento.nombre}`);
      return { success: true, documento: documentos[index] };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al restaurar documento:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Reordena documentos (cambio de orden o paso)
 */
export async function reorderDocuments(docId, nuevoOrden, nuevoPaso, adminUID, adminNombre) {
  try {
    // Cargar configuración actual
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const documentos = config.documentos;
    
    // Encontrar el documento
    const index = documentos.findIndex(doc => doc.id === docId);
    if (index === -1) {
      return { success: false, message: 'Documento no encontrado' };
    }
    
    const estadoAnterior = { 
      orden: documentos[index].orden, 
      paso: documentos[index].paso 
    };
    
    // Actualizar orden y/o paso
    documentos[index] = {
      ...documentos[index],
      orden: nuevoOrden,
      paso: nuevoPaso,
      fechaModificacion: new Date().toISOString()
    };
    
    // Guardar configuración actualizada
    const resultado = await guardarConfiguracion(documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'reordenar',
        { id: docId, nombre: documentos[index].nombre, esBase: documentos[index].esBase },
        { estadoAnterior, estadoNuevo: { orden: nuevoOrden, paso: nuevoPaso } },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Documento reordenado: ${documentos[index].nombre}`);
      return { success: true, documento: documentos[index] };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al reordenar documento:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Exporta la configuración actual como JSON
 */
export async function exportConfig() {
  try {
    const config = await cargarConfiguracion();
    if (!config.success) {
      return { success: false, message: 'No se pudo cargar la configuración' };
    }
    
    const exportData = {
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalDocuments: config.documentos.length,
        documentosBase: config.documentos.filter(d => d.esBase).length,
        documentosAdicionales: config.documentos.filter(d => !d.esBase).length,
        documentosActivos: config.documentos.filter(d => d.activo).length,
        documentosInactivos: config.documentos.filter(d => !d.activo).length
      },
      documentos: config.documentos
    };
    
    // Crear blob y descargar
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documentos-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Configuración exportada correctamente');
    return { success: true, data: exportData };
    
  } catch (error) {
    console.error('❌ Error al exportar configuración:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Importa configuración desde JSON
 */
export async function importConfig(jsonData, adminUID, adminNombre) {
  try {
    // Validar estructura del JSON
    if (!jsonData.documentos || !Array.isArray(jsonData.documentos)) {
      return { success: false, message: 'Estructura de JSON inválida: falta array "documentos"' };
    }
    
    // Validar que contenga los campos requeridos
    const camposRequeridos = ['id', 'nombre', 'categoria', 'paso', 'tipo', 'requerido', 'orden', 'activo', 'esBase'];
    const documentosValidos = jsonData.documentos.every(doc => 
      camposRequeridos.every(campo => doc.hasOwnProperty(campo))
    );
    
    if (!documentosValidos) {
      return { success: false, message: 'Algunos documentos no tienen todos los campos requeridos' };
    }
    
    // Validar que existan los documentos base críticos (10 obligatorios)
    const idsBaseCriticos = [
      'fotoAntecedentesPenales',
      'fotoConductor',
      'fotoCarneIdentidadAnverso',
      'fotoCarneIdentidadReverso',
      'fotoLicenciaConducirAnverso',
      'fotoLicenciaConducirReverso',
      'fotoSoat',
      'fotoPermisoCirculacion',
      'fotoRevisionTecnica',
      'fotoVehiculo1'
    ];
    
    const documentosActivos = jsonData.documentos.filter(d => d.activo);
    const faltanBaseCriticos = idsBaseCriticos.filter(id => 
      !documentosActivos.some(doc => doc.id === id)
    );
    
    if (faltanBaseCriticos.length > 0) {
      return { 
        success: false, 
        message: `Faltan documentos base críticos: ${faltanBaseCriticos.join(', ')}` 
      };
    }
    
    // Crear backup antes de importar
    const config = await cargarConfiguracion();
    if (config.success) {
      const backupRef = doc(db, 'configuracion', `documentosRegistro_backup_${Date.now()}`);
      await setDoc(backupRef, {
        documentos: config.documentos,
        fechaBackup: new Date().toISOString(),
        motivoBackup: 'Backup automático antes de importación'
      });
      console.log('✅ Backup creado antes de importar');
    }
    
    // Guardar nueva configuración
    const resultado = await guardarConfiguracion(jsonData.documentos, adminUID, adminNombre);
    
    if (resultado.success) {
      // Registrar en historial
      await registrarEnHistorial(
        'importar',
        { total: jsonData.documentos.length },
        { 
          documentosImportados: jsonData.documentos.length,
          metadata: jsonData.metadata 
        },
        adminUID,
        adminNombre
      );
      
      console.log(`✅ Configuración importada: ${jsonData.documentos.length} documentos`);
      return { success: true, documentos: jsonData.documentos };
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error al importar configuración:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Obtiene el historial de cambios
 */
export async function obtenerHistorial() {
  try {
    const historialRef = collection(db, 'configuracion', 'documentosRegistro', 'historial');
    const historialSnap = await getDocs(historialRef);
    
    const historial = [];
    historialSnap.forEach(doc => {
      historial.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por timestamp descendente
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { success: true, historial };
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    return { success: false, message: error.message, historial: [] };
  }
}

export default {
  cargarConfiguracion,
  createDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  reorderDocuments,
  exportConfig,
  importConfig,
  obtenerHistorial
};
