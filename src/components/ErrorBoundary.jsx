import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Captura las excepciones de render de sus hijos (tarjeta 1451).
 *
 * POR QUÉ HACE FALTA: sin un boundary, React desmonta TODO el árbol cuando algo
 * tira durante el render, y el panel queda en blanco. Sin barra lateral, sin
 * forma de navegar, sin mensaje: indistinguible de un problema de datos o de
 * conexión. Eso ya nos costó tiempo de diagnóstico en la tarjeta 1392.
 *
 * Tiene que ser una clase: los hooks no pueden capturar errores de render, no
 * hay equivalente a `componentDidCatch` en un componente de función.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola del navegador con el árbol de componentes, que es
    // lo que hace falta para ubicar dónde reventó.
    console.error("Error de render capturado por ErrorBoundary:", error, info);
  }

  /**
   * Vuelve a intentar el render sin recargar la página.
   *
   * Sirve cuando la causa fue transitoria, por ejemplo un dato que llegó a
   * medias. Si el error es determinista, el boundary lo vuelve a capturar y la
   * pantalla queda igual, que es correcto: no promete más de lo que puede.
   */
  reintentar = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto bg-white border border-red-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
            <h2 className="text-xl font-bold text-gray-800">
              Esta sección no se pudo mostrar
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Ocurrió un error al dibujar la pantalla. El resto del panel sigue
            funcionando: podés cambiar de sección desde el menú de la izquierda.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Detalle
            </p>
            <p className="text-sm text-gray-700 break-words">
              {error?.message || String(error)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={this.reintentar}
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Recargar la página
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Si vuelve a pasar, pasale el texto del detalle al equipo técnico: es
            lo que permite ubicar la causa.
          </p>
        </div>
      </div>
    );
  }
}
