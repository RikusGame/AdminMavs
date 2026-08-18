// Secciones del panel sobre las que se dan permisos por administrador.
// El id coincide con el `activeSection` de App.jsx y el id del menú (Sidebar).
export const SECCIONES_ADMIN = [
  { id: "dashboard", label: "Panel de Control" },
  { id: "usuarios", label: "Usuarios" },
  { id: "conductores", label: "Conductores" },
  { id: "empresas", label: "Empresas" },
  { id: "documentos", label: "Documentos" },
  { id: "viajes", label: "Viajes" },
  { id: "mapa-conductoras", label: "Mapa de conductoras" },
  { id: "gestion-documentos", label: "Gestión Documentos" },
  { id: "qr-recarga", label: "QR de Recarga" },
  { id: "banners", label: "Banners" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "tarifas", label: "Servicios" },
  { id: "administradores", label: "Administradores" },
  { id: "preguntas-frecuentes", label: "Preguntas Frecuentes" },
  { id: "reglas", label: "Reglas de conductores" },
];

export const IDS_SECCIONES = SECCIONES_ADMIN.map((s) => s.id);
