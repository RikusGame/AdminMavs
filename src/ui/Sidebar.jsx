import {
  Home,
  Users,
  Car,
  FileText,
  CreditCard,
  MapPin,
  BarChart3,
  Search,
  ChevronRight,
  ChevronDown,
  Ruler,
  Flag,
  DollarSign,
  HelpCircle,
  X,
  Settings,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export function Sidebar({ activeSection, setActiveSection }) {
  const [isDriversMenuOpen, setIsDriversMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Panel de Control", icon: Home, section: "administración general" },
    { id: "usuarios", label: "Usuarios", icon: Users, section: "cuentas" },
    {
      id: "conductores",
      label: "Conductores",
      icon: Car,
      section: "cuentas",
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: FileText,
      section: "cuentas",
    },
    {
      id: "gestion-documentos",
      label: "Gestión Documentos",
      icon: Settings,
      section: "configuración",
    },
    // {
    //   id: "inicializar-config",
    //   label: "⚙️ Inicializar Config",
    //   icon: Settings,
    //   section: "configuración",
    // }, // Oculto: script de inicialización que ya no se debe usar desde el panel
    { id: "qr-recarga", label: "QR de Recarga", icon: CreditCard, section: "configuración" },
    { id: "banners", label: "Banners", icon: Flag, section: "configuración" },
    { id: "tarifas", label: "Servicios", icon: DollarSign, section: "configuración" },
    {
      id: "plan-suscripcion",
      label: "Plan de Suscripción",
      icon: CreditCard,
      section: "en construcción",
    },
    { id: "preguntas-frecuentes", label: "Preguntas Frecuentes", icon: HelpCircle, section: "en construcción" },
    { id: "reglas", label: "Reglas de conductores", icon: Ruler, section: "en construcción" },
  ];

  const isDriverSubSectionActive = activeSection.startsWith("conductores-");
  
  const groupedMenuItems = useMemo(() => {
    const groups = {};
    menuItems.forEach(item => {
      const sectionKey = item.section.toLowerCase();
      if (!groups[sectionKey]) {
        groups[sectionKey] = { title: item.section, items: [] };
      }
      groups[sectionKey].items.push(item);
    });
    return Object.values(groups);
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) {
      return groupedMenuItems;
    }
    const term = searchTerm.toLowerCase();
    return groupedMenuItems.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(term) ||
        (item.subItems && item.subItems.some(sub => sub.label.toLowerCase().includes(term)))
      )
    })).filter(group => group.items.length > 0);
  }, [searchTerm, groupedMenuItems]);


  useEffect(() => {
    if (isDriverSubSectionActive && !isDriversMenuOpen) {
      setIsDriversMenuOpen(true);
    }
  }, [activeSection, isDriversMenuOpen, isDriverSubSectionActive]);

  return (
    <>
      {/* Zona de activación visible con iconos */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-16 z-40 bg-[#1a1d29] shadow-lg"
      >
        {/* Iconos siempre visibles */}
        <div className="p-2 border-b border-gray-700 flex items-center justify-center">
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
            className="w-10 h-10 bg-[#a8d96f] rounded-full flex items-center justify-center mt-2 hover:bg-[#96c55f] transition-colors"
            title={isExpanded ? "Cerrar menú" : "Abrir menú"}
          >
            <Car className="w-6 h-6 text-[#1a1d29]" />
          </button>
        </div>
        <nav className="flex flex-col items-center gap-2 px-2 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeSection === item.id
                  ? "bg-[#a8d96f] text-[#1a1d29]"
                  : "text-gray-300 hover:bg-[#252836]"
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </nav>
      </div>
      
      <aside 
        className={`fixed left-0 top-0 bottom-0 bg-[#1a1d29] text-white flex flex-col transition-transform duration-300 ease-in-out z-50 shadow-2xl ${
          isExpanded ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px]'
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
                      if (item.id === "reportes") {
                        setIsReportsMenuOpen(!isReportsMenuOpen);
                        if (isDriversMenuOpen) setIsDriversMenuOpen(false); 
                      } else {
                        setActiveSection(item.id);
                        setIsDriversMenuOpen(false);
                        setIsReportsMenuOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      activeSection === item.id ||
                      (item.id === "reportes" && isReportSubSectionActive)
                        ? "bg-[#a8d96f] text-[#1a1d29]"
                        : "text-gray-300 hover:bg-[#252836]"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>

                    {item.subItems ? (
                      (item.id === "reportes" && isReportsMenuOpen) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )
                    ) : null}
                  </button>

                  
                  {item.id === "reportes" && isReportsMenuOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems?.map((subItem) => (
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
    </aside>
    </>
  );
}
