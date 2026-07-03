import * as XLSX from "xlsx";

// Convierte fechas de Firestore (Timestamp / {seconds} / ISO / Date) a texto.
function fechaLegible(v) {
  if (!v) return "";
  let d;
  if (typeof v?.toDate === "function") d = v.toDate();
  else if (typeof v?.seconds === "number") d = new Date(v.seconds * 1000);
  else d = new Date(v);
  return d && !isNaN(d.getTime()) ? d.toLocaleString("es-BO") : "";
}

// Descarga el libro con la fecha de hoy en el nombre.
function descargarLibro(wb, base) {
  const hoy = new Date();
  const stamp = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `${base}_${stamp}.xlsx`);
}

/**
 * Exporta la lista de usuarios (pasajeros/taxistas) a Excel.
 * @param {Array} usuarios - lista ya filtrada (misma que se ve en la tabla)
 */
export function exportarUsuariosAExcel(usuarios) {
  const filas = (usuarios || []).map((u) => ({
    Nombre: u.nombre || "",
    "Correo electrónico": u.email || "",
    Teléfono: u.telefono || "",
    Tipo: u.modo === "taxista" ? "Conductora" : "Pasajero",
    Estado: u.activo ? "Activo" : "Inactivo",
    "Fecha de registro": fechaLegible(u.fechaRegistro),
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [
    { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
  descargarLibro(wb, "usuarios");
}

/**
 * Exporta la lista de conductoras a Excel.
 * @param {Array} conductores - lista ya filtrada (misma que se ve en la tabla)
 */
export function exportarConductoresAExcel(conductores) {
  const filas = (conductores || []).map((c) => {
    const d = c.documentos || {};
    const vehiculo = [d.marca, d.modelo]
      .filter((x) => x && `${x}`.trim() !== "")
      .join(" ");
    return {
      Nombre: c.nombre || "",
      "Correo electrónico": c.email || "",
      Teléfono: c.telefono || "",
      Servicio: d.servicioSeleccionado || "Sin asignar",
      Departamento: d.departamentoServicio || "",
      Vehículo: vehiculo,
      Placa: (d.numeroPlaca || d.placa || "").toString().toUpperCase(),
      Habilitada: c.habilitado ? "Sí" : "No",
      "Documentos completos": c.tieneDocumentos ? "Sí" : "No",
      "Fecha de registro": fechaLegible(c.createdAt),
    };
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [
    { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conductoras");
  descargarLibro(wb, "conductoras");
}

/**
 * Exporta una lista de viajes a un archivo Excel (.xlsx).
 * @param {Array} viajes - lista ya filtrada de viajes
 */
export function exportarViajesAExcel(viajes) {
  const filas = (viajes || []).map((v) => ({
    "ID Orden": v.ordenId || v.id || "",
    Conductor: v.conductorNombre || "",
    "Tel. Conductor": v.conductorTelefono || "",
    "Correo Conductor": v.conductorCorreo || "",
    Pasajero: v.uidPasajero || "",
    Origen: v.origen || "",
    Destino: v.destino || "",
    Servicio: v.servicio || "",
    Tipo: v.tipoViaje === "programado" ? "Programado" : "Normal",
    Categoría: v.categoriaViaje === "empresa" ? "Empresa" : "Normal",
    Fecha:
      v.fecha instanceof Date
        ? v.fecha.toLocaleString("es-BO")
        : "",
    "Distancia (km)": Number(v.km || 0),
    Estado: v.estado || "",
    Pago: v.metodoPago || "",
    "Estado Pago": v.estadoPago || "",
    "Monto (Bs.)": Number(v.total || 0),
  }));

  const ws = XLSX.utils.json_to_sheet(filas);

  // Anchos de columna para que se lea cómodo
  ws["!cols"] = [
    { wch: 12 }, // ID
    { wch: 22 }, // Conductor
    { wch: 14 }, // Tel
    { wch: 26 }, // Correo
    { wch: 24 }, // Pasajero
    { wch: 30 }, // Origen
    { wch: 30 }, // Destino
    { wch: 14 }, // Servicio
    { wch: 12 }, // Tipo
    { wch: 12 }, // Categoría
    { wch: 20 }, // Fecha
    { wch: 14 }, // Distancia
    { wch: 14 }, // Estado
    { wch: 12 }, // Pago
    { wch: 14 }, // Estado pago
    { wch: 14 }, // Monto
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Viajes");

  const hoy = new Date();
  const stamp = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `viajes_${stamp}.xlsx`);
}
