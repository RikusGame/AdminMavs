/**
 * adminValidator.js - Utilidad para validar permisos administrativos
 * Verifica si un usuario tiene rol de administrador
 */

import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Super-admins: acceso TOTAL siempre (no se pueden restringir).
// NOTA: no poner contraseñas en comentarios (antes había dos claves acá; se
// quitaron y deben rotarse por acción humana). Estos emails viajan al bundle
// publicado; el control real de super-admin conviene migrarlo a un custom
// claim de Firebase Auth (claim `superadmin`) — ver tarjeta [180].
export const ADMIN_EMAILS = [
  "gabriela.strauss@gmail.com",
  "admin@mujeresalvolante.com",
  "pruebas@sistemas.com",
  "mujeresalvolanteboliviaadmin@gmail.com",
];

// Roles que cuentan como administrador del panel. El backend reconoce
// "superadmin" (functions-email verificarAdmin), así que el panel también
// debe aceptarlo o esas cuentas quedaban bloqueadas fuera. (Tarjeta [193])
export const ROLES_ADMIN = ["admin", "superadmin"];

/**
 * Acceso del admin actual:
 *  - { permisos: 'all', esSuper: true }  → super-admin (acceso total)
 *  - { permisos: 'all', esSuper: false } → admin sin permisos definidos (legacy)
 *  - { permisos: [ids], esSuper: false } → admin con permisos por sección
 */
// Compara emails en minúsculas (Firebase Auth conserva el email tal como se
// registró, así que "Gabriela.Strauss@..." no matcheaba la lista).
const esEmailSuperAdmin = (email) =>
  ADMIN_EMAILS.includes(String(email || "").toLowerCase());

export async function obtenerAccesoAdmin() {
  try {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return { permisos: [], esSuper: false };
    if (esEmailSuperAdmin(currentUser.email)) {
      return { permisos: "all", esSuper: true };
    }
    const snap = await getDoc(doc(db, "administradores", currentUser.uid));
    const data = snap.exists() ? snap.data() : {};
    // Admin desactivado → sin acceso a ninguna sección.
    if (data.activo === false) return { permisos: [], esSuper: false };
    // Sin `permisos` definidos → acceso total (compat. con admins ya creados).
    const permisos = Array.isArray(data.permisos) ? data.permisos : "all";
    return { permisos, esSuper: false };
  } catch (e) {
    // FAIL-CLOSED: ante cualquier error (red, timeout, o una regla de
    // Firestore que deniega la lectura) NO conceder acceso. Antes devolvía
    // permisos:"all", o sea que el error se convertía en acceso total —
    // justo cuando el usuario probablemente NO debía entrar. (Tarjeta [190])
    console.error("Error obteniendo acceso de admin:", e);
    return { permisos: [], esSuper: false, error: true };
  }
}

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
      // Admin desactivado → NO cuenta como admin (antes bastaba que el doc
      // existiera y un admin dado de baja seguía entrando al panel).
      if (adminSnap.data().activo === false) return "user";
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
    if (esEmailSuperAdmin(currentUser.email)) {
      return true;
    }

    // Custom claim del TOKEN. Es la vía robusta para las REGLAS de Firestore
    // (ver [185]), pero para el gate del panel NO alcanza por sí solo: el
    // token sigue siendo válido hasta ~1h y el claim no se limpia en el mismo
    // instante en que se desactiva a una admin. Por eso el claim NO hace
    // short-circuit: SIEMPRE se revalida `activo` contra Firestore.
    // (Regresión detectada en QA de [195]: una admin con claim + activo:false
    // volvía a entrar al panel. El claim se lee en IdTokenResult.claims, no en
    // currentUser.customClaims —que no existe en el SDK cliente—.)
    const tokenResult = await currentUser.getIdTokenResult(true);
    const tieneClaimAdmin =
      tokenResult.claims.admin === true ||
      tokenResult.claims.superadmin === true;

    // El doc de `administradores` es la fuente de verdad del gate: getUserRole
    // devuelve "user" si activo===false, aunque el token traiga el claim.
    const role = await getUserRole(currentUser.uid);
    const esAdminPorDoc = ROLES_ADMIN.includes(role);

    if (tieneClaimAdmin && !esAdminPorDoc) {
      // Token con claim de admin pero el doc no habilita (desactivada, borrada
      // o error de lectura). No se concede: manda el doc. Queda pendiente que
      // el backend limpie el claim al desactivar (trigger sincronizarClaimAdmin
      // en functions-email, ver [195]); mientras tanto, este gate ya bloquea.
      console.warn(
        "isCurrentUserAdmin: token trae claim de admin pero el doc no habilita " +
          "(activo:false / inexistente). Acceso denegado.",
      );
    }

    return esAdminPorDoc;
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
