import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Envía el correo de bienvenida al conductor con sus credenciales.
 *
 * Llama a una Cloud Function de Firebase ('enviarCorreoConductor') que usa
 * el SMTP de Hostinger (nodemailer). Mientras esa función no esté desplegada,
 * falla de forma controlada y devuelve { sent: false } para que el alta del
 * conductor NO se interrumpa (las credenciales se muestran en pantalla).
 */
// El backend resuelve el email destino desde el `uid` (email autoritativo de
// Auth); NO se le pasa el `correo` (antes cualquiera podía mandar a cualquier
// dirección: era phishing con dominio legítimo). (Tarjeta [188])
export async function enviarCorreoBienvenidaConductor({ uid, nombre, password }) {
  return llamarCorreo("enviarCorreoConductor", { uid, nombre, password });
}

/** Igual que la del conductor, pero para un nuevo administrador del panel. */
export async function enviarCorreoBienvenidaAdmin({ uid, nombre, password }) {
  return llamarCorreo("enviarCorreoAdmin", { uid, nombre, password });
}

async function llamarCorreo(nombreFuncion, datos) {
  try {
    const functions = getFunctions(undefined, "us-central1");
    const fn = httpsCallable(functions, nombreFuncion);
    await fn(datos);
    return { sent: true };
  } catch (e) {
    console.warn(
      `[sendWelcomeEmail] Correo no enviado (${nombreFuncion}):`,
      e?.message || e
    );
    return { sent: false, reason: e?.message || String(e) };
  }
}
