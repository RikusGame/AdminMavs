import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

// Lista de documentos que se le piden a una conductora al darla de alta
// (tarjeta 1459).
//
// POR QUÉ EXISTE: el modal de alta tenía la lista ESCRITA A MANO, mientras que
// la app valida contra `configuracion/documentosRegistro` en Firestore. Nadie
// mantenía las dos sincronizadas, y ya se habían separado en los dos sentidos:
//
//  - CINCO documentos que la app marca `requerido` el panel los trataba como
//    opcionales (antecedentes, SOAT, permiso de circulación, revisión técnica y
//    la primera foto del vehículo). El admin daba de alta sin ellos, el panel
//    lo aceptaba, y la app le mostraba "Documentos Incompletos" a la conductora
//    desde el primer login.
//  - En producción se agregaron documentos por la pantalla de configuración
//    (RUAT, Factura Luz o Agua) que el panel nunca ofreció subir.
//
// Leyendo la misma fuente que la app, las dos no se pueden volver a separar,
// ni con estos documentos ni con los que se agreguen después.

/// Documento donde vive la configuración. Es el mismo que administra
/// `DocumentConfigManager` y el que lee la app.
const RUTA = ["configuracion", "documentosRegistro"];

// Copia del fallback embebido de la app (documentos_config_service.dart) y del
// script `initDocumentosConfig.js`. Se usa sólo si el documento no existe o la
// lectura falla, para que el panel no se quede sin nada que pedir.
export const DOCUMENTOS_FALLBACK = [
  { id: "fotoAntecedentesPenales", nombre: "Antecedentes Penales", paso: 1, orden: 1, requerido: true },
  { id: "fotoConductor", nombre: "Foto del Conductor", paso: 1, orden: 2, requerido: true },
  { id: "fotoCarneIdentidadAnverso", nombre: "Carné de Identidad (Anverso)", paso: 1, orden: 3, requerido: true },
  { id: "fotoCarneIdentidadReverso", nombre: "Carné de Identidad (Reverso)", paso: 1, orden: 4, requerido: true },
  { id: "fotoLicenciaConducirAnverso", nombre: "Licencia de Conducir (Anverso)", paso: 1, orden: 5, requerido: true },
  { id: "fotoLicenciaConducirReverso", nombre: "Licencia de Conducir (Reverso)", paso: 1, orden: 6, requerido: true },
  { id: "fotoSoat", nombre: "SOAT", paso: 2, orden: 1, requerido: true },
  { id: "fotoPermisoCirculacion", nombre: "Permiso de Circulación", paso: 2, orden: 2, requerido: true },
  { id: "fotoRevisionTecnica", nombre: "Revisión Técnica", paso: 2, orden: 3, requerido: true },
  { id: "fotoVehiculo1", nombre: "Fotografía del Vehículo 1", paso: 3, orden: 1, requerido: true },
  { id: "fotoVehiculo2", nombre: "Fotografía del Vehículo 2", paso: 3, orden: 2, requerido: false },
];

function normalizar(bruto) {
  return {
    id: String(bruto.id ?? "").trim(),
    nombre: String(bruto.nombre ?? bruto.id ?? "").trim(),
    paso: Number(bruto.paso ?? 0),
    orden: Number(bruto.orden ?? 0),
    requerido: bruto.requerido === true,
  };
}

function ordenar(lista) {
  return [...lista].sort(
    (a, b) => a.paso - b.paso || a.orden - b.orden || a.nombre.localeCompare(b.nombre)
  );
}

/**
 * Devuelve los documentos de FOTO activos que hay que pedir al dar de alta.
 *
 * Se filtra por `tipo === 'foto'` porque el alta sube archivos: los campos de
 * texto o selección de la configuración se completan después desde la app. Es
 * el mismo filtro que usa el chequeo de "documentos completos" de la app.
 *
 * Ante cualquier problema devuelve el fallback: quedarse sin lista sería peor
 * que usar una desactualizada.
 */
export async function cargarDocumentosRegistro() {
  try {
    const snap = await getDoc(doc(db, ...RUTA));
    if (!snap.exists()) return ordenar(DOCUMENTOS_FALLBACK);

    const brutos = snap.data()?.documentos;
    if (!Array.isArray(brutos)) return ordenar(DOCUMENTOS_FALLBACK);

    const documentos = brutos
      .filter((d) => d && d.activo === true && d.tipo === "foto")
      .map(normalizar)
      .filter((d) => d.id !== "");

    if (documentos.length === 0) return ordenar(DOCUMENTOS_FALLBACK);
    return ordenar(documentos);
  } catch (error) {
    console.error("cargarDocumentosRegistro:", error);
    return ordenar(DOCUMENTOS_FALLBACK);
  }
}
