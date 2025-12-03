import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Car, MapPin } from 'lucide-react';

const ingresosData = [
  { mes: 'Ene', ingresos: 12500 },
  { mes: 'Feb', ingresos: 15800 },
  { mes: 'Mar', ingresos: 18200 },
  { mes: 'Abr', ingresos: 14600 },
  { mes: 'May', ingresos: 21400 },
  { mes: 'Jun', ingresos: 19800 },
  { mes: 'Jul', ingresos: 23500 },
  { mes: 'Ago', ingresos: 25200 },
  { mes: 'Sep', ingresos: 22800 },
  { mes: 'Oct', ingresos: 28400 },
];

const viajesPorHora = [
  { hora: '6am', viajes: 45 },
  { hora: '9am', viajes: 120 },
  { hora: '12pm', viajes: 95 },
  { hora: '3pm', viajes: 85 },
  { hora: '6pm', viajes: 145 },
  { hora: '9pm', viajes: 78 },
  { hora: '12am', viajes: 32 },
];

const distribucionPlanes = [
  { name: 'Premium', value: 45, color: '#4169E1' },
  { name: 'Básico', value: 12, color: '#9CA3AF' },
  { name: 'Enterprise', value: 8, color: '#8B5CF6' },
];

export function Reportes() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Reportes</h1>
            <p className="text-sm text-gray-500">Análisis y estadísticas del sistema</p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {'>'} Reportes
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              +12.5%
            </div>
          </div>
          <div className="text-2xl mb-1">Bs. 28,400</div>
          <div className="text-sm text-gray-500">Ingresos del Mes</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              +8.3%
            </div>
          </div>
          <div className="text-2xl mb-1">1,245</div>
          <div className="text-sm text-gray-500">Viajes Este Mes</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Car className="w-8 h-8 text-purple-500" />
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <TrendingDown className="w-4 h-4" />
              -2.1%
            </div>
          </div>
          <div className="text-2xl mb-1">65</div>
          <div className="text-sm text-gray-500">Conductores Activos</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-orange-500" />
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              +15.7%
            </div>
          </div>
          <div className="text-2xl mb-1">114</div>
          <div className="text-sm text-gray-500">Usuarios Registrados</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Ingresos Mensuales */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3>Ingresos Mensuales</h3>
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option>2025</option>
              <option>2024</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ingresosData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="ingresos" fill="#4169E1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Viajes por Hora */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3>Viajes por Hora del Día</h3>
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option>Hoy</option>
              <option>Ayer</option>
              <option>Última Semana</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={viajesPorHora}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="viajes" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Distribución de Planes */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="mb-4">Distribución de Planes de Suscripción</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={distribucionPlanes}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distribucionPlanes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {distribucionPlanes.map((plan, index) => (
                <div key={index} className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: plan.color }}></div>
                    <span className="text-sm">{plan.name}</span>
                  </div>
                  <span>{plan.value} conductores</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="mb-4">Métricas Principales</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <div className="text-sm text-gray-500">Calificación Promedio</div>
                <div className="text-xl">4.7 / 5.0</div>
              </div>
              <div className="text-yellow-500">⭐⭐⭐⭐⭐</div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <div className="text-sm text-gray-500">Tiempo Promedio de Viaje</div>
                <div className="text-xl">18 min</div>
              </div>
              <div className="text-green-600">-2 min</div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <div className="text-sm text-gray-500">Tasa de Cancelación</div>
                <div className="text-xl">3.2%</div>
              </div>
              <div className="text-green-600">-1.1%</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Ingresos por Viaje</div>
                <div className="text-xl">Bs. 22.80</div>
              </div>
              <div className="text-green-600">+Bs. 1.50</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
