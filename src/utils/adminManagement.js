/**
 * adminManagement.js - Utilidades para gestionar administradores
 * Usa esta función en la consola de Firebase o en un script backend
 */

import { db } from "../config/firebase";
import { doc, setDoc, updateDoc, deleteDoc, getDoc, collection, getDocs } from "firebase/firestore";

/**
 * Agrega un nuevo administrador
 * @param {string} uid - UID del usuario Firebase
 * @param {string} email - Email del usuario  
 * @param {string} nombre - Nombre del administrador
 * @param {array} permisos - Permisos que tendrá (opcional)
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function addAdmin(
  uid,
  email,
  nombre,
  permisos = ["usuarios", "conductores", "documentos", "banners", "servicios"]
) {
  try {
    const adminRef = doc(db, "administradores", uid);

    await setDoc(adminRef, {
      email,
      nombre,
      rol: "admin",
      permisos,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Administrador ${email} agregado exitosamente`);
    return { success: true, message: `Admin creado: ${email}` };
  } catch (error) {
    console.error(`❌ Error al agregar admin:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene información de un administrador por UID
 * @param {string} uid - UID del usuario
 * @returns {Promise<object|null>} - Datos del admin o null
 */
export async function getAdminByUID(uid) {
  try {
    const adminRef = doc(db, "administradores", uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
      return { uid, ...adminSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`❌ Error al obtener admin:`, error);
    return null;
  }
}

/**
 * Lista todos los administradores
 * @returns {Promise<array>} - Lista de administradores
 */
export async function getAllAdmins() {
  try {
    const adminsRef = collection(db, "administradores");
    const querySnapshot = await getDocs(adminsRef);

    const admins = [];
    querySnapshot.forEach((doc) => {
      admins.push({ uid: doc.id, ...doc.data() });
    });

    console.log(
      `✅ Se encontraron ${admins.length} administradores:`,
      admins
    );
    return admins;
  } catch (error) {
    console.error(`❌ Error al listar admins:`, error);
    return [];
  }
}

/**
 * Actualiza los permisos de un administrador
 * @param {string} uid - UID del usuario
 * @param {array} nuevoPermisos - Nuevos permisos
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function updateAdminPermissions(uid, nuevoPermisos) {
  try {
    const adminRef = doc(db, "administradores", uid);

    await updateDoc(adminRef, {
      permisos: nuevoPermisos,
      updatedAt: new Date(),
    });

    console.log(`✅ Permisos del admin ${uid} actualizados`);
    return { success: true, message: "Permisos actualizados" };
  } catch (error) {
    console.error(`❌ Error al actualizar permisos:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Desactiva un administrador
 * @param {string} uid - UID del usuario
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function deactivateAdmin(uid) {
  try {
    const adminRef = doc(db, "administradores", uid);

    await updateDoc(adminRef, {
      activo: false,
      deactivatedAt: new Date(),
    });

    console.log(`✅ Admin ${uid} desactivado`);
    return { success: true, message: "Admin desactivado" };
  } catch (error) {
    console.error(`❌ Error al desactivar admin:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Elimina un administrador completamente
 * @param {string} uid - UID del usuario
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function removeAdmin(uid) {
  try {
    const adminRef = doc(db, "administradores", uid);
    await deleteDoc(adminRef);

    console.log(`✅ Admin ${uid} eliminado`);
    return { success: true, message: "Admin eliminado" };
  } catch (error) {
    console.error(`❌ Error al eliminar admin:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica si un email está registrado como admin
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>}
 */
export async function isEmailAdmin(email) {
  try {
    const admins = await getAllAdmins();
    return admins.some((admin) => admin.email === email && admin.activo);
  } catch (error) {
    console.error(`❌ Error al verificar email:`, error);
    return false;
  }
}

export default {
  addAdmin,
  getAdminByUID,
  getAllAdmins,
  updateAdminPermissions,
  deactivateAdmin,
  removeAdmin,
  isEmailAdmin,
};
