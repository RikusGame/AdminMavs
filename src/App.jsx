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
import { EnConstruccion } from "./pages/EnConstruccion";
import { Servicios } from "./pages/Servicios";

export default function App() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState(null);
  const [selectedConductorId, setSelectedConductorId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Limpiar selecciones cuando cambia la sección activa
  useEffect(() => {
    setSelectedUsuarioId(null);
    setSelectedConductorId(null);
  }, [activeSection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

  const renderContent = () => {
    // Si hay un usuario seleccionado, mostrar su perfil
    if (selectedUsuarioId) {
      return <PerfilUsuario usuarioId={selectedUsuarioId} onBack={() => setSelectedUsuarioId(null)} />;
    }

    // Si hay un conductor seleccionado, mostrar su perfil
    if (selectedConductorId) {
      return <PerfilConductor conductorId={selectedConductorId} onBack={() => setSelectedConductorId(null)} />;
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
      
      case "gestion-documentos":
        return <GestionDocumentos />;
      
      // case "inicializar-config":
      //   return <InicializarConfig />; // Ruta deshabilitada (script de una sola vez)
      
      case "tarifas":
        return <Servicios />;
      
      case "banners":
        return <Banners />;
      
      case "qr-recarga":
        return <QRManager />;
      
      // Páginas en construcción
      case "plan-suscripcion":
      case "preguntas-frecuentes":
      case "reglas":
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
      />
      {/* Espaciador para el sidebar con iconos - 64px */}
      <div className="w-16" />
      <main className="flex-1 overflow-auto">{renderContent()}</main>
    </div>
  );
}
