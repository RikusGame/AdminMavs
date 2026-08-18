/**
 * Mapa de Google embebido (iframe) con un pin en la ubicación dada.
 * Va DENTRO del admin (no redirige a otra pestaña) y no requiere API key.
 */
export function MiniMapaUbicacion({ lat, lng, alto = "h-64" }) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  const valido = !Number.isNaN(la) && !Number.isNaN(ln);

  if (!valido) {
    return (
      <p className="text-sm text-gray-500">
        Sin coordenadas para mostrar el mapa.
      </p>
    );
  }

  const src = `https://maps.google.com/maps?q=${la},${ln}&z=16&hl=es&output=embed`;

  return (
    <iframe
      title="Ubicación del domicilio"
      src={src}
      className={`w-full ${alto} rounded-lg border border-gray-200`}
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

export default MiniMapaUbicacion;
