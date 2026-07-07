import {
  Home,
  Users,
  Car,
  FileText,
  CreditCard,
  MapPin,
  Search,
  ChevronRight,
  ChevronDown,
  Ruler,
  Flag,
  DollarSign,
  HelpCircle,
  X,
  Settings,
  ShieldCheck,
  Building2,
  Map as MapIcon,
  Bell,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { PerfilAdminModal } from "../components/PerfilAdminModal";

// Base de la documentación publicada en el mismo hosting (mav-tic.com/ayuda).
// Cada sección del menú enlaza a su ancla: /ayuda/#<id>.
const DOCS_BASE = "/ayuda/";

export function Sidebar({ activeSection, setActiveSection, isExpanded, setIsExpanded, puede }) {
  const [isDriversMenuOpen, setIsDriversMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  // Tooltip de ayuda con enlace "Ver más". Se posiciona fijo (fixed) a partir
  // del ícono "?" para no quedar recortado por el scroll del menú.
  const [hint, setHint] = useState(null); // { text, href, top, left }
  const hintTimer = useRef(null);

  const mostrarHint = (e, item) => {
    clearTimeout(hintTimer.current);
    const r = e.currentTarget.getBoundingClientRect();
    setHint({
      text: item.ayuda,
      href: `${DOCS_BASE}#${item.id}`,
      top: Math.min(r.top, window.innerHeight - 150),
      left: r.right + 12,
    });
  };
  const ocultarHintPronto = () => {
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 180);
  };
  const mantenerHint = () => clearTimeout(hintTimer.current);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Panel de Control",
      icon: Home,
      section: "administración general",
      ayuda:
        "Pantalla de inicio. Muestra un resumen general: cantidad de viajes, comisiones ganadas y recargas del período.",
    },
    {
      id: "usuarios",
      label: "Usuarios",
      icon: Users,
      section: "cuentas",
      ayuda:
        "Lista de todas las pasajeras y conductoras registradas. Podés buscar, ver el perfil de cada una y descargar la lista en Excel.",
    },
    {
      id: "conductores",
      label: "Conductores",
      icon: Car,
      section: "cuentas",
      ayuda:
        "Gestión de conductoras: ver su perfil, habilitarlas para trabajar, asignarles el servicio, ver su saldo y sus documentos. Exportable a Excel.",
    },
    {
      id: "empresas",
      label: "Empresas",
      icon: Building2,
      section: "cuentas",
      ayuda:
        "Cuentas corporativas que pagan los viajes de sus empleados. Podés activarlas, desactivarlas y ver su facturación.",
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: FileText,
      section: "cuentas",
      ayuda:
        "Revisión de los documentos que suben las conductoras (licencia, carnet, etc.). Podés aprobarlos o rechazarlos con un motivo; a la conductora le llega un aviso.",
    },
    {
      id: "viajes",
      label: "Viajes",
      icon: MapPin,
      section: "viajes",
      ayuda:
        "Historial de todos los viajes, con filtros por estado, fecha y conductora, y buscador. Se puede descargar en Excel.",
    },
    {
      id: "mapa-conductoras",
      label: "Mapa de conductoras",
      icon: MapIcon,
      section: "viajes",
      ayuda:
        "Mapa en vivo con las conductoras que están conectadas en este momento. Tocá una para centrarla en el mapa.",
    },
    {
      id: "gestion-documentos",
      label: "Gestión Documentos",
      icon: Settings,
      section: "configuración",
      ayuda:
        "Configurar qué documentos se les piden a las conductoras al registrarse (agregar, quitar, marcar obligatorios).",
    },
    {
      id: "qr-recarga",
      label: "QR de Recarga",
      icon: CreditCard,
      section: "configuración",
      ayuda:
        "El código QR con el que las conductoras recargan saldo, y la bandeja de comprobantes: aprobás o rechazás las recargas que envían.",
    },
    {
      id: "banners",
      label: "Banners",
      icon: Flag,
      section: "configuración",
      ayuda:
        "Las imágenes promocionales que ven las usuarias en la pantalla principal de la app. Podés subirlas, activarlas o quitarlas.",
    },
    {
      id: "notificaciones",
      label: "Notificaciones",
      icon: Bell,
      section: "configuración",
      ayuda:
        "Enviar avisos (push) a las usuarias: a todas, solo a pasajeras, solo a conductoras o a una persona en particular.",
    },
    {
      id: "tarifas",
      label: "Servicios",
      icon: DollarSign,
      section: "configuración",
      ayuda:
        "Los tipos de servicio (Taxi, Moto taxi, etc.) con sus tarifas por departamento. Crear, editar precios y activar o desactivar.",
    },
    {
      id: "administradores",
      label: "Administradores",
      icon: ShieldCheck,
      section: "configuración",
      ayuda:
        "Crear otras cuentas de administración y darles niveles de acceso (qué secciones puede ver cada una).",
    },
    {
      id: "preguntas-frecuentes",
      label: "Preguntas Frecuentes",
      icon: HelpCircle,
      section: "configuración",
      ayuda:
        "Las preguntas y respuestas que ven las usuarias en la sección de ayuda de la app. Podés dirigirlas a pasajeras, conductoras o ambas.",
    },
    {
      id: "reglas",
      label: "Reglas de conductores",
      icon: Ruler,
      section: "configuración",
      ayuda:
        "El catálogo de reglas del auto (No mascotas, Prohibido fumar, etc.) que cada conductora elige para su vehículo y ven las pasajeras.",
    },
  ];

  const isDriverSubSectionActive =
    typeof activeSection === "string" &&
    activeSection.startsWith("conductores-");

  // Solo las secciones permitidas para este admin (niveles de acceso).
  const itemsVisibles =
    typeof puede === "function"
      ? menuItems.filter((it) => puede(it.id))
      : menuItems;

  const groupedMenuItems = useMemo(() => {
    const groups = {};
    itemsVisibles.forEach((item) => {
      const sectionKey = item.section.toLowerCase();
      if (!groups[sectionKey]) {
        groups[sectionKey] = { title: item.section, items: [] };
      }
      groups[sectionKey].items.push(item);
    });
    return Object.values(groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsVisibles]);

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupedMenuItems;
    }

    const term = searchTerm.toLowerCase();

    return groupedMenuItems
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(term) ||
            item.section.toLowerCase().includes(term) ||
            (item.subItems || []).some((sub) =>
              sub.label.toLowerCase().includes(term)
            )
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm, groupedMenuItems]);

  useEffect(() => {
    if (isDriverSubSectionActive && !isDriversMenuOpen) {
      setIsDriversMenuOpen(true);
    }
  }, [isDriverSubSectionActive, isDriversMenuOpen]);

  return (
    <>
      <div
        className="fixed left-0 top-0 bottom-0 w-16 z-40 bg-[#1a1d29] shadow-lg"
        onMouseEnter={() => setIsExpanded(true)}
      >
        <div className="p-2 border-b border-gray-700 flex items-center justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-10 h-10 bg-[#a8d96f] rounded-full flex items-center justify-center mt-2 hover:bg-[#96c55f] transition-colors"
            title={isExpanded ? "Cerrar menú" : "Abrir menú"}
          >
            <Car className="w-6 h-6 text-[#1a1d29]" />
          </button>
        </div>

        <nav className="flex flex-col items-center gap-2 px-2 py-4 overflow-y-auto">
          {itemsVisibles.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeSection === item.id
                  ? "bg-[#a8d96f] text-[#1a1d29]"
                  : "text-gray-300 hover:bg-[#252836]"
              }`}
              title={item.ayuda ? `${item.label} — ${item.ayuda}` : item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2 px-2 py-3 border-t border-gray-700">
          <button
            onClick={() => setMostrarPerfil(true)}
            className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-300 hover:bg-[#252836] transition-colors"
            title="Mi perfil"
          >
            <UserCircle className="w-5 h-5" />
          </button>
          <button
            onClick={cerrarSesion}
            className="w-12 h-12 flex items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <aside
        onMouseLeave={() => setIsExpanded(false)}
        className={`fixed left-0 top-0 bottom-0 bg-[#1a1d29] text-white flex flex-col transition-transform duration-300 ease-in-out z-50 shadow-2xl ${
          isExpanded ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"
        }`}
      >
        <style jsx global>{`
          .scroll-bar-personalizada::-webkit-scrollbar {
            width: 8px;
          }
          .scroll-bar-personalizada::-webkit-scrollbar-track {
            background: #1a1d29;
          }
          .scroll-bar-personalizada::-webkit-scrollbar-thumb {
            background-color: #3e4453;
            border-radius: 20px;
            border: 2px solid #1a1d29;
          }
          .scroll-bar-personalizada::-webkit-scrollbar-thumb:hover {
            background-color: #a8d96f;
          }
        `}</style>

        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#a8d96f] rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-[#1a1d29]" />
            </div>
            <span className="font-semibold text-white">Menú</span>
          </div>

          <button
            onClick={() => setIsExpanded(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#252836] transition-colors"
            title="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar Menú"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#252836] text-white placeholder-gray-400 rounded-lg pl-10 pr-3 py-2 outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto scroll-bar-personalizada">
          {filteredMenuItems.map((group, index) => (
            <div key={index}>
              <div className="text-[11px] text-gray-500 uppercase tracking-wider px-3 py-2 border-t border-gray-700 mt-2 first:mt-0 first:border-t-0">
                {group.title}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        if (item.subItems) {
                          if (item.id === "conductores") {
                            setIsDriversMenuOpen(!isDriversMenuOpen);
                          }
                        } else {
                          setActiveSection(item.id);
                          setIsDriversMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        activeSection === item.id
                          ? "bg-[#a8d96f] text-[#1a1d29]"
                          : "text-gray-300 hover:bg-[#252836]"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>

                      {/* Ícono de ayuda: al pasar el mouse muestra un tooltip
                          con la explicación + enlace "Ver más" a la guía. Al
                          hacer clic abre la guía directo. No navega de sección. */}
                      {item.ayuda && (
                        <span
                          onMouseEnter={(e) => mostrarHint(e, item)}
                          onMouseLeave={ocultarHintPronto}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `${DOCS_BASE}#${item.id}`,
                              "_blank",
                              "noopener"
                            );
                          }}
                          className={`shrink-0 cursor-help transition-opacity ${
                            activeSection === item.id
                              ? "text-[#1a1d29]/70 hover:text-[#1a1d29]"
                              : "text-gray-500 hover:text-[#a8d96f]"
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {item.subItems ? (
                        item.id === "conductores" && isDriversMenuOpen ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )
                      ) : null}
                    </button>

                    {item.id === "conductores" &&
                      isDriversMenuOpen &&
                      item.subItems && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => setActiveSection(subItem.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                                activeSection === subItem.id
                                  ? "bg-[#3e4453] text-[#a8d96f]"
                                  : "text-gray-400 hover:bg-[#252836]"
                              }`}
                            >
                              <span className="text-left">{subItem.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: perfil + cerrar sesión */}
        <div className="border-t border-gray-700 p-3 space-y-1">
          <button
            onClick={() => setMostrarPerfil(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-[#252836] transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            <span className="flex-1 text-left">Mi perfil</span>
          </button>
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="flex-1 text-left">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Tooltip de ayuda con enlace "Ver más" (posición fija, no se recorta) */}
      {hint && (
        <div
          onMouseEnter={mantenerHint}
          onMouseLeave={ocultarHintPronto}
          style={{ position: "fixed", top: hint.top, left: hint.left }}
          className="z-[70] w-64 bg-white text-[#1a1d29] rounded-xl shadow-2xl border border-gray-200 p-3"
        >
          <p className="text-[13px] leading-snug text-gray-700">{hint.text}</p>
          <a
            href={hint.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-green-600 hover:text-green-700"
          >
            Ver más
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {mostrarPerfil && (
        <PerfilAdminModal onClose={() => setMostrarPerfil(false)} />
      )}
    </>
  );
}