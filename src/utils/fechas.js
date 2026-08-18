/**
 * fechas.js — utilidades para normalizar y filtrar fechas de Firestore.
 * Acepta: Timestamp de Firestore (.toDate), {seconds}, ISO string, millis o Date.
 */

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Devuelve la fecha formateada (es-BO) o "—" si no hay. */
export function formatFecha(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * ¿La fecha cae dentro del rango rápido seleccionado?
 * range: 'todos' | 'hoy' | '7d' | '30d'
 */
export function dentroDeRango(value, range) {
  if (range === "todos") return true;
  const d = toDate(value);
  if (!d) return false; // sin fecha no entra en rangos específicos
  const now = new Date();
  const start = new Date(now);
  if (range === "hoy") {
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (range === "7d") {
    start.setDate(now.getDate() - 7);
    return d >= start;
  }
  if (range === "30d") {
    start.setDate(now.getDate() - 30);
    return d >= start;
  }
  return true;
}
