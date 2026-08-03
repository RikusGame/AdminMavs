import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";
import { Sidebar } from "./ui/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Usuarios } from "./pages/Usuarios";
import { Conductores } from "./pages/Conductores";
import { Login } from "./pages/Login";
import Banners from "./pages/Banners";
import Documentos from "./pages/Documentos";
import GestionDocumentos from "./pages/GestionDocumentos";
// import InicializarConfig from "./pages/InicializarConfig"; // Ya no se usa en el panel
import { PerfilUsuario } from "./pages/PerfilUsuario";
import { PerfilConductor } from "./pages/PerfilConductor";
import { QRManager } from "./components/QRManager";
import { SolicitudesRecarga } from "./components/SolicitudesRecarga";
import { EnConstruccion } from "./pages/EnConstruccion";
import { Servicios } from "./pages/Servicios";
import { Administradores } from "./pages/Administradores";
import { Empresas } from "./pages/Empresas";
import { MapaConductores } from "./pages/MapaConductores";
import { Notificaciones } from "./pages/Notificaciones";
import { PreguntasFrecuentes } from "./pages/PreguntasFrecuentes";
import { ReglasConductores } from "./pages/ReglasConductores";
import ViajesSection from "./pages/viajes_section";
import { isCurrentUserAdmin, obtenerAccesoAdmin } from "./utils/adminValidator";
import { IDS_SECCIONES } from "./config/seccionesAdmin";
import { UnauthorizedAccess } from "./pages/UnauthorizedAccess";

export default function App() {
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("adminActiveSection") || "dashboard"
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState(null);
  const [selectedConductorId, setSelectedConductorId] = useState(null);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [acceso, setAcceso] = useState(null); // {permisos:'all'|[ids], esSuper}

  // ¿El admin actual puede ver esta sección?
  // FAIL-CLOSED: mientras `acceso` no cargó, NO conceder (antes devolvía true
  // "mientras carga"). El render de contenido ya está detrás del loader
  // (loading || checkingPermissions), así que esto solo cierra el hueco. (Tarjeta [190])
  const puede = (id) => {
    if (!acceso) return false;
    if (acceso.permisos === "all") return true;
    return Array.isArray(acceso.permisos) && acceso.permisos.includes(id);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsAdmin(false);
      setCheckingPermissions(false);
      return;
    }

    setCheckingPermissions(true);
    isCurrentUserAdmin()
      .then((result) => {
        if (!cancelled) setIsAdmin(result);
      })
      .catch((error) => {
        console.error("Error verificando permisos de admin:", error);
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingPermissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setSelectedUsuarioId(null);
    setSelectedConductorId(null);
    // Recordar la sección actual para mantenerla al refrescar la página.
    try {
      localStorage.setItem("adminActiveSection", activeSection);
    } catch (_) {
      /* noop */
    }
  }, [activeSection]);

  // Cargar el acceso (permisos por sección) del admin actual.
  useEffect(() => {
    if (!isAdmin) {
      setAcceso(null);
      return;
    }
    let cancel = false;
    obtenerAccesoAdmin().then((a) => {
      if (!cancel) setAcceso(a);
    });
    return () => {
      cancel = true;
    };
  }, [isAdmin]);

  // Si la sección guardada no está permitida, ir a la primera permitida.
  useEffect(() => {
    if (!acceso || acceso.permisos === "all") return;
    if (!acceso.permisos.includes(activeSection)) {
      const primera =
        IDS_SECCIONES.find((id) => acceso.permisos.includes(id)) || "dashboard";
      setActiveSection(primera);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso]);

  if (loading || checkingPermissions) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

  if (!isAdmin) {
    return <UnauthorizedAccess userEmail={user.email} />;
  }

  const renderContent = () => {
    if (selectedUsuarioId) {
      return (
        <PerfilUsuario
          usuarioId={selectedUsuarioId}
          onBack={() => setSelectedUsuarioId(null)}
        />
      );
    }

    if (selectedConductorId) {
      return (
        <PerfilConductor
          conductorId={selectedConductorId}
          onBack={() => setSelectedConductorId(null)}
        />
      );
    }

    if (acceso && acceso.permisos !== "all" && !puede(activeSection)) {
      return (
        <div className="p-8 text-gray-500">
          No tenés acceso a esta sección.
        </div>
      );
    }

    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;

      case "usuarios":
        return <Usuarios onSelectUsuario={setSelectedUsuarioId} />;

      case "conductores":
        return <Conductores onSelectConductor={setSelectedConductorId} />;

      case "documentos":
        return <Documentos />;

      case "viajes":
        return <ViajesSection />;

      case "gestion-documentos":
        return <GestionDocumentos />;

      case "tarifas":
        return <Servicios />;

      case "banners":
        return <Banners />;

      case "qr-recarga":
        // QR de cobro + bandeja de comprobantes que los usuarios envían
        // desde la app (solicitudesRecarga). Antes la bandeja no existía y
        // las recargas enviadas quedaban pendientes sin que nadie las viera.
        return (
          <div className="p-6 space-y-6">
            <SolicitudesRecarga />
            <QRManager />
          </div>
        );

      case "administradores":
        return <Administradores />;

      case "empresas":
        return <Empresas />;

      case "mapa-conductoras":
        return <MapaConductores />;

      case "notificaciones":
        return <Notificaciones />;

      case "preguntas-frecuentes":
        return <PreguntasFrecuentes />;

      case "reglas":
        return <ReglasConductores />;

      case "plan-suscripcion":
        return <EnConstruccion />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5]">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isExpanded={menuExpanded}
        setIsExpanded={setMenuExpanded}
        puede={puede}
      />
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          menuExpanded ? "w-[260px]" : "w-16"
        }`}
      />
      <main className="flex-1 overflow-auto min-w-0">{renderContent()}</main>
    </div>
  );
}