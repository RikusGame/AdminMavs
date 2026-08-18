import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toDate } from "./fechas";

function fechaCorta(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function money(n) {
  return `Bs ${Number(n || 0).toFixed(2)}`;
}

/**
 * Genera una factura/reporte PDF de las carreras de una empresa en un periodo.
 * @param {object} empresa  doc de la empresa (nombre, razonSocial, nit, ...)
 * @param {Array} viajes    carreras ya filtradas del periodo
 * @param {{desde: Date, hasta: Date}} periodo
 */
export function generarFacturaEmpresaPDF(empresa, viajes, periodo) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Cabecera de marca
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Mujeres al Volante", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Detalle de servicios — Cuenta corporativa", margin, 52);

  // Datos de la empresa
  doc.setTextColor(31, 41, 55);
  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(empresa.razonSocial || empresa.nombre || "Empresa", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  y += 16;
  if (empresa.nombre && empresa.nombre !== empresa.razonSocial) {
    doc.text(`Nombre comercial: ${empresa.nombre}`, margin, y);
    y += 14;
  }
  doc.text(`NIT: ${empresa.nit || "—"}`, margin, y);
  y += 14;
  if (empresa.direccion) {
    doc.text(
      `Dirección: ${empresa.direccion}${
        empresa.ciudad ? ", " + empresa.ciudad : ""
      }`,
      margin,
      y
    );
    y += 14;
  }
  doc.text(
    `Periodo: ${fechaCorta(periodo.desde)} — ${fechaCorta(periodo.hasta)}`,
    margin,
    y
  );
  y += 14;
  doc.text(`Emitido: ${fechaCorta(new Date())}`, margin, y);

  // Tabla de carreras
  const filas = (viajes || []).map((v, i) => [
    i + 1,
    fechaCorta(v.completadoEn || v.createdAt),
    v.solicitanteNombre || v.solicitanteUid || "—",
    v.origen || "—",
    v.destino || "—",
    money(v.total),
  ]);

  const total = (viajes || []).reduce(
    (acc, v) => acc + Number(v.total || 0),
    0
  );

  autoTable(doc, {
    startY: y + 18,
    head: [["#", "Fecha", "Pasajero", "Origen", "Destino", "Monto"]],
    body: filas,
    foot: [["", "", "", "", "TOTAL", money(total)]],
    theme: "striped",
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 24 },
      5: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  const nit = (empresa.nit || "empresa").replace(/\s+/g, "");
  const stamp = fechaCorta(periodo.hasta).replace(/\//g, "-");
  doc.save(`factura_${nit}_${stamp}.pdf`);
}

/** Exporta las carreras del periodo a Excel. */
export function exportarFacturacionExcel(empresa, viajes, periodo) {
  const filas = (viajes || []).map((v) => ({
    Fecha: fechaCorta(v.completadoEn || v.createdAt),
    Pasajero: v.solicitanteNombre || v.solicitanteUid || "",
    Origen: v.origen || "",
    Destino: v.destino || "",
    Servicio: v.servicio || "",
    "Monto (Bs.)": Number(v.total || 0),
  }));
  filas.push({
    Fecha: "",
    Pasajero: "",
    Origen: "",
    Destino: "TOTAL",
    "Monto (Bs.)": (viajes || []).reduce(
      (acc, v) => acc + Number(v.total || 0),
      0
    ),
  });

  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Facturación");
  const nit = (empresa.nit || "empresa").replace(/\s+/g, "");
  const stamp = fechaCorta(periodo.hasta).replace(/\//g, "-");
  XLSX.writeFile(wb, `facturacion_${nit}_${stamp}.xlsx`);
}
