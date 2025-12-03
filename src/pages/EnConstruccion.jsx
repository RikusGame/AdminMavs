import { Construction, Wrench, Clock } from "lucide-react";

export function EnConstruccion() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8 max-w-md">
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-yellow-400 rounded-full opacity-20 animate-ping"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <Construction className="w-24 h-24 text-yellow-500" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          En Construcción
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Estamos trabajando en esta funcionalidad
        </p>
        
        <div className="flex items-center justify-center gap-4 text-gray-500 mb-8">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            <span className="text-sm">Desarrollando</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Próximamente</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">
            Esta página estará disponible pronto. Estamos trabajando para ofrecerte 
            la mejor experiencia posible.
          </p>
        </div>
      </div>
    </div>
  );
}
