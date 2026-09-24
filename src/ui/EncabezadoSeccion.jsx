/**
 * EL ENCABEZADO DE UNA SECCIÓN DEL PANEL. Tarjeta [1743].
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ESTE ES EL ESTÁNDAR. Si vas a poner un título de sección, usá esto.
 *  No escribas un <h1> a mano: así fue como llegamos al problema.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * QUÉ PASABA ANTES (relevado el 23/09/2026, 23 títulos en el panel):
 *
 *   sin ninguna clase .................... 10 pantallas
 *   text-2xl font-bold text-gray-800 ......  4
 *   text-2xl font-bold text-gray-900 ......  3
 *   text-3xl font-bold text-gray-800 ......  2  (fichas de perfil)
 *   text-4xl ..............................  2  (pantallas a página completa)
 *   text-2xl md:text-4xl con degradado ....  1
 *
 * Los diez sin clases heredaban lo que hubiera, así que el mismo panel tenía
 * títulos de cinco tamaños distintos según la pantalla.
 *
 * EL ESTÁNDAR ELEGIDO es `text-2xl font-bold text-gray-800`, que era la
 * variante más usada entre las que estaban puestas a propósito. No se eligió
 * por gusto: es la que menos pantallas obliga a cambiar y la que ya combina
 * con el resto del texto del panel.
 *
 * DOS EXCEPCIONES, a propósito y no por olvido:
 *  - Login, Acceso Denegado y En Construcción son pantallas a página completa
 *    sin menú al lado. Ahí el título es el protagonista y va más grande.
 *  - Las fichas de perfil (usuario, conductora) muestran el NOMBRE de una
 *    persona dentro de una tarjeta con portada, no el título de una sección.
 *    Es otro rol visual y se deja como está.
 */

/**
 * LAS CLASES DEL TÍTULO. Esta constante es la fuente de verdad.
 *
 * Las pantallas que ya tenían su propia estructura de encabezado la usan
 * directamente en su `<h1>`, en vez de reescribirles el JSX: así el estándar
 * queda en UN solo lugar sin tocarles el armado a diez pantallas.
 * Para una pantalla NUEVA, usá el componente de abajo y listo.
 */
export const CLASES_TITULO_SECCION = "text-2xl font-bold text-gray-800";

/**
 * @param {Object} props
 * @param {string} props.titulo lo que va en el <h1>
 * @param {string} [props.subtitulo] una línea de contexto, opcional
 * @param {React.ReactNode} [props.acciones] botones a la derecha, opcional
 * @param {React.ReactNode} [props.icono] un ícono antes del título, opcional
 * @param {string} [props.className] clases extra para el contenedor
 */
export function EncabezadoSeccion({
  titulo,
  subtitulo,
  acciones,
  icono,
  className = "",
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 mb-6 ${className}`}
    >
      <div className="min-w-0">
        <h1 className={`${CLASES_TITULO_SECCION} flex items-center gap-2`}>
          {icono}
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>
        )}
      </div>
      {acciones && (
        <div className="flex items-center gap-3 shrink-0">{acciones}</div>
      )}
    </div>
  );
}

export default EncabezadoSeccion;
