/**
 * Script de inicialización de configuración de documentos
 * Ejecutar una sola vez para poblar la colección configuracion/documentosRegistro
 * con los 11 documentos base del sistema
 */

import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Configuración de documentos base del sistema
const documentosBase = [
  // PASO 1: Documentos Personales
  {
    id: 'fotoAntecedentesPenales',
    nombre: 'Antecedentes Penales',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 1,
    descripcion: 'Certificado de antecedentes penales vigente',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoConductor',
    nombre: 'Foto del Conductor',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 2,
    descripcion: 'Fotografía reciente del conductor',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoCarneIdentidadAnverso',
    nombre: 'Carné de Identidad (Anverso)',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 3,
    descripcion: 'Parte frontal del carné de identidad',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoCarneIdentidadReverso',
    nombre: 'Carné de Identidad (Reverso)',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 4,
    descripcion: 'Parte posterior del carné de identidad',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoLicenciaConducirAnverso',
    nombre: 'Licencia de Conducir (Anverso)',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 5,
    descripcion: 'Parte frontal de la licencia de conducir',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoLicenciaConducirReverso',
    nombre: 'Licencia de Conducir (Reverso)',
    categoria: 'Documentos Personales',
    paso: 1,
    tipo: 'foto',
    requerido: true,
    orden: 6,
    descripcion: 'Parte posterior de la licencia de conducir',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  
  // PASO 2: Documentos del Vehículo
  {
    id: 'fotoSoat',
    nombre: 'SOAT',
    categoria: 'Documentos Vehículo',
    paso: 2,
    tipo: 'foto',
    requerido: true,
    orden: 1,
    descripcion: 'Seguro Obligatorio de Accidentes de Tránsito vigente',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoPermisoCirculacion',
    nombre: 'Permiso de Circulación',
    categoria: 'Documentos Vehículo',
    paso: 2,
    tipo: 'foto',
    requerido: true,
    orden: 2,
    descripcion: 'Permiso de circulación vigente del vehículo',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoRevisionTecnica',
    nombre: 'Revisión Técnica',
    categoria: 'Documentos Vehículo',
    paso: 2,
    tipo: 'foto',
    requerido: true,
    orden: 3,
    descripcion: 'Certificado de revisión técnica vehicular vigente',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  
  // PASO 3: Fotografías del Vehículo
  {
    id: 'fotoVehiculo1',
    nombre: 'Fotografía del Vehículo 1',
    categoria: 'Fotografías Vehículo',
    paso: 3,
    tipo: 'foto',
    requerido: true,
    orden: 1,
    descripcion: 'Foto principal del vehículo (vista frontal)',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'fotoVehiculo2',
    nombre: 'Fotografía del Vehículo 2',
    categoria: 'Fotografías Vehículo',
    paso: 3,
    tipo: 'foto',
    requerido: false,
    orden: 2,
    descripcion: 'Foto adicional del vehículo (vista lateral - opcional)',
    activo: true,
    esBase: true,
    fechaCreacion: new Date().toISOString()
  }
];

/**
 * Inicializa la configuración de documentos en Firestore
 */
export async function initDocumentosConfig() {
  try {
    const configRef = doc(db, 'configuracion', 'documentosRegistro');
    
    // Verificar si ya existe la configuración
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      console.log('⚠️ La configuración de documentos ya existe.');
      console.log('Si desea reinicializar, elimine manualmente el documento primero.');
      return { success: false, message: 'La configuración ya existe' };
    }
    
    // Crear configuración inicial
    const configData = {
      documentos: documentosBase,
      version: '1.0',
      ultimaModificacion: new Date().toISOString(),
      modificadoPor: 'sistema',
      modificadoPorNombre: 'Inicialización Automática'
    };
    
    await setDoc(configRef, configData);
    
    console.log('✅ Configuración de documentos inicializada correctamente');
    console.log(`📄 Total documentos base: ${documentosBase.length}`);
    console.log(`📋 Por categoría:`);
    console.log(`   - Documentos Personales: 6`);
    console.log(`   - Documentos Vehículo: 3`);
    console.log(`   - Fotografías Vehículo: 2`);
    
    return { success: true, message: 'Configuración inicializada', data: configData };
    
  } catch (error) {
    console.error('❌ Error al inicializar configuración:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Verifica el estado de la configuración
 */
export async function verificarConfig() {
  try {
    const configRef = doc(db, 'configuracion', 'documentosRegistro');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
      console.log('❌ La configuración no existe');
      return { exists: false };
    }
    
    const data = configSnap.data();
    console.log('✅ Configuración encontrada');
    console.log(`📄 Total documentos: ${data.documentos?.length || 0}`);
    console.log(`📅 Última modificación: ${data.ultimaModificacion}`);
    console.log(`👤 Modificado por: ${data.modificadoPorNombre}`);
    
    return { exists: true, data };
    
  } catch (error) {
    console.error('❌ Error al verificar configuración:', error);
    return { exists: false, error: error.message };
  }
}

// Exportar documentos base para uso en otros componentes
export { documentosBase };
