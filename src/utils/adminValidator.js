/**
 * adminValidator.js - Utilidad para validar permisos administrativos
 * Verifica si un usuario tiene rol de administrador
 */

import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Obtiene el rol del usuario desde Firestore
 * @param {string} userId - UID del usuario
 * @returns {Promise<string|null>} - Rol del usuario o null si no existe
 */
export async function getUserRole(userId) {
  try {
    // Buscar en colección de admins
    const adminRef = doc(db, "administradores", userId);
    const adminSnap = await getDoc(adminRef);
    
    if (adminSnap.exists()) {
      return adminSnap.data().rol || "admin";
    }

    // Si no está en administradores, es un usuario regular
    return "user";
  } catch (error) {
    console.error("Error al obtener rol del usuario:", error);
    return null;
  }
}

/**
 * Verifica si el usuario actual es administrador
 * @returns {Promise<boolean>} - true si es admin, false si no
 */
export async function isCurrentUserAdmin() {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return false;
    }

    // ✨ Verificar si es un email especial de administrador
    const adminEmails = [
      "gabriela.strauss@gmail.com",
      "admin@mujeresalvolante.com",
      "pruebas@sistemas.com"
      //123456
    ];
    
    if (adminEmails.includes(currentUser.email)) {
      return true;
    }

    // Recargar token para obtener claims actualizados
    await currentUser.getIdTokenResult(true);
    
    // Verificar en Firebase Auth custom claims
    if (currentUser.customClaims?.admin === true) {
      return true;
    }

    // Alternativa: Verificar en Firestore
    const role = await getUserRole(currentUser.uid);
    return role === "admin";
  } catch (error) {
    console.error("Error al verificar si es admin:", error);
    return false;
  }
}

/**
 * Obtiene información del usuario admin
 * @returns {Promise<object|null>} - Datos del administrador
 */
export async function getAdminInfo() {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return null;
    }

    const adminRef = doc(db, "administradores", currentUser.uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
      return {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        ...adminSnap.data(),
      };
    }

    return null;
  } catch (error) {
    console.error("Error al obtener información de admin:", error);
    return null;
  }
}
