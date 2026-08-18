/**
 * FilterChips — filtro compacto tipo "pill" con etiqueta en línea, icono,
 * contador y color semántico. Pensado para vivir en una barra que fluye.
 *
 * Props:
 *  - label?: string
 *  - value: string
 *  - onChange: (value) => void
 *  - options: Array<{ value, label, icon?, count?, tone? }>
 *      tone: 'green' | 'blue' | 'amber' | 'red' | 'slate'
 */

// Clases completas y literales para que Tailwind las detecte en el build.
const TONES = {
  green: "from-green-500 to-green-600",
  blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-orange-500",
  red: "from-red-500 to-rose-600",
  slate: "from-slate-500 to-slate-600",
};

export function FilterChips({ label, value, onChange, options = [] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-0.5">
          {label}
        </span>
      )}
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        const tone = TONES[opt.tone] || TONES.green;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all duration-200 ${
              active
                ? `bg-gradient-to-r ${tone} text-white border-transparent shadow-sm`
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-700"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FilterChips;
