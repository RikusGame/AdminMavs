import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Selector de catálogo, equivalente al `CatalogoDropdown` de la app (tarjeta
// 1446).
//
// POR QUÉ EXISTE: marca, color y tipo de vehículo se eligen en la app de una
// lista controlada, y en el panel eran texto libre. El mismo campo terminaba
// con un valor del catálogo o con lo que alguien hubiera tipeado, así que
// cualquier filtro o reporte por marca quedaba inservible. En la captura de la
// tarjeta 1447 se ve el caso: la marca cargada como "zusuky".
//
// Lee exactamente lo mismo que la app: `catalogos/{id}/items` con
// `activo == true`, tomando el campo `nombre`.

// Mismas listas que `catalogo_dropdown.dart`. Se usan si la subcolección está
// vacía o falla la lectura, para que el panel no quede sin opciones y bloquee
// un alta. Si divergen de las de la app, gana el catálogo de Firestore, que es
// lo que leen los dos lados.
const FALLBACKS = {
  vehiculos_marcas: [
    "Toyota", "Suzuki", "Nissan", "Hyundai", "Kia", "Chevrolet",
    "Volkswagen", "Honda", "Mitsubishi", "Mazda", "Ford", "JAC",
    "Chery", "Geely", "Great Wall", "Renault", "Peugeot", "Subaru",
    "BYD", "Lifan", "Dongfeng", "Foton", "Ssangyong",
  ],
  vehiculos_colores: [
    "Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul", "Verde",
    "Amarillo", "Marrón", "Beige", "Naranja", "Vino", "Celeste",
  ],
  vehiculos_tipos: [
    "Sedán", "SUV", "Hatchback", "Minivan", "Camioneta", "Pickup",
    "Motocicleta", "Microbús", "Vagoneta",
  ],
};

const OTRO = "__otro__";

/**
 * Selector con escape a texto libre.
 *
 * Se le pasa `catalogoId` para leer de Firestore, o `opcionesFijas` para una
 * lista generada en el momento (el año del modelo, por ejemplo).
 *
 * La opción "Otro..." existe a propósito: la app tiene `catalogos_pendientes`
 * para proponer valores nuevos, y sin un escape equivalente el panel quedaría
 * bloqueado ante una marca que todavía no está en el catálogo.
 */
export function CatalogoSelect({
  catalogoId,
  opcionesFijas,
  value,
  onChange,
  disabled = false,
  placeholder = "Selecciona...",
  className = "",
  inputMode,
}) {
  const [opciones, setOpciones] = useState(opcionesFijas || []);
  const [cargando, setCargando] = useState(!opcionesFijas);
  const [modoLibre, setModoLibre] = useState(false);

  useEffect(() => {
    if (opcionesFijas) {
      setOpciones(opcionesFijas);
      setCargando(false);
      return;
    }
    if (!catalogoId) return;

    let cancelado = false;
    (async () => {
      let items = [];
      try {
        const snap = await getDocs(
          query(
            collection(db, "catalogos", catalogoId, "items"),
            where("activo", "==", true)
          )
        );
        items = snap.docs
          .map((d) => String(d.data().nombre ?? "").trim())
          .filter((s) => s !== "")
          .sort();
      } catch (error) {
        console.error(`CatalogoSelect[${catalogoId}]:`, error);
      }

      if (items.length === 0) items = [...(FALLBACKS[catalogoId] || [])].sort();
      if (cancelado) return;
      setOpciones(items);
      setCargando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [catalogoId, opcionesFijas]);

  // Si ya hay un valor cargado que no está en la lista, se muestra en texto
  // libre en vez de perderse al no poder representarlo en el select.
  const valorFueraDeLista =
    !cargando && value !== "" && !opciones.includes(value);
  const enTextoLibre = modoLibre || valorFueraDeLista;

  if (cargando) {
    return (
      <select className={className} disabled>
        <option>Cargando...</option>
      </select>
    );
  }

  if (enTextoLibre) {
    return (
      <div className="flex gap-2">
        <input
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          inputMode={inputMode}
          autoFocus={modoLibre}
        />
        <button
          type="button"
          onClick={() => {
            setModoLibre(false);
            onChange("");
          }}
          disabled={disabled}
          className="shrink-0 text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Ver lista
        </button>
      </div>
    );
  }

  return (
    <select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === OTRO) {
          setModoLibre(true);
          onChange("");
          return;
        }
        onChange(e.target.value);
      }}
    >
      <option value="">{placeholder}</option>
      {opciones.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
      <option value={OTRO}>Otro...</option>
    </select>
  );
}
