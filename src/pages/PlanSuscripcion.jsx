import { Check, Crown, Users, UserCircle, Badge } from 'lucide-react';

const planes = [
  {
    id: 1,
    nombre: 'Plan Básico',
    precio: 50,
    periodo: 'mes',
    descripcion: 'Ideal para conductores que están comenzando',
    caracteristicas: [
      'Hasta 50 viajes por mes',
      'Comisión del 20%',
      'Soporte por email',
      'Acceso a la app móvil',
      'Estadísticas básicas',
    ],
    color: 'gray',
    usuarios: 12,
  },
  {
    id: 2,
    nombre: 'Plan Premium',
    precio: 100,
    periodo: 'mes',
    descripcion: 'Para conductores profesionales',
    caracteristicas: [
      'Viajes ilimitados',
      'Comisión del 15%',
      'Soporte prioritario 24/7',
      'Acceso a la app móvil',
      'Estadísticas avanzadas',
      'Prioridad en asignación de viajes',
      'Capacitación mensual',
    ],
    color: 'blue',
    usuarios: 45,
    destacado: true,
  },
  {
    id: 3,
    nombre: 'Plan Enterprise',
    precio: 250,
    periodo: 'mes',
    descripcion: 'Para flotas de conductores',
    caracteristicas: [
      'Viajes ilimitados',
      'Comisión del 10%',
      'Soporte dedicado 24/7',
      'Panel de administración de flota',
      'API para integración',
      'Reportes personalizados',
      'Capacitación continua',
      'Gestor de cuenta asignado',
    ],
    color: 'purple',
    usuarios: 8,
  },
];

const conductoresPorPlan = [
  {
    plan: 'Premium',
    conductor: 'Carlos Mendoza',
    fechaInicio: '2025-01-15',
    estado: 'Activo',
  },
  {
    plan: 'Premium',
    conductor: 'María González',
    fechaInicio: '2025-02-20',
    estado: 'Activo',
  },
  {
    plan: 'Básico',
    conductor: 'José Ramírez',
    fechaInicio: '2025-09-10',
    estado: 'Activo',
  },
  {
    plan: 'Premium',
    conductor: 'Ana Torres',
    fechaInicio: '2024-12-05',
    estado: 'Activo',
  },
  {
    plan: 'Básico',
    conductor: 'Pedro Sánchez',
    fechaInicio: '2025-10-25',
    estado: 'Activo',
  },
  {
    plan: 'Enterprise',
    conductor: 'Flota TransExpress',
    fechaInicio: '2025-03-01',
    estado: 'Activo',
  },
];

export function PlanSuscripcion() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Planes de Suscripción</h1>
            <p className="text-sm text-gray-500">Gestiona los planes y suscripciones de los conductores</p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {'>'} Plan de Suscripción
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {planes.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{plan.nombre}</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl mb-1">{plan.usuarios}</div>
            <div className="text-sm text-gray-500">Conductores activos</div>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {planes.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg p-6 shadow-sm border-2 ${
              plan.destacado ? 'border-blue-500' : 'border-transparent'
            } relative`}
          >
            {plan.destacado && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Más Popular
                </Badge>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="mb-2">{plan.nombre}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.descripcion}</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl">Bs. {plan.precio}</span>
                <span className="text-gray-500">/{plan.periodo}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.caracteristicas.map((caracteristica, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{caracteristica}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-2 rounded-lg ${
                plan.destacado
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Gestionar Plan
            </button>
          </div>
        ))}
      </div>

      {/* Conductores por Plan */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="mb-4">Conductores Suscritos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Conductor</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Fecha de Inicio</th>
                <th className="text-left py-3 px-4">Estado</th>
                <th className="text-left py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conductoresPorPlan.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-white" />
                      </div>
                      <span>{item.conductor}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        item.plan === 'Premium'
                          ? 'default'
                          : item.plan === 'Enterprise'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {item.plan}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.fechaInicio}</td>
                  <td className="py-3 px-4">
                    <Badge variant="default">{item.estado}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-blue-500 hover:text-blue-600 text-sm">
                      Cambiar Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
