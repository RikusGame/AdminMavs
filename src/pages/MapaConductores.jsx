import { useEffect, useRef, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Car, CircleDot, RefreshCw, Users } from "lucide-react";
import { db } from "../config/firebase";

// API key de Google Maps. Va por env: este repo es PUBLICO y GitHub bloquea
// el push si la credencial queda en el codigo. Definir
// VITE_GOOGLE_MAPS_API_KEY en el .env local y en el entorno de build
// (ver .env.example).
//
// El valor queda embebido en el bundle publicado — es el modelo de uso normal
// de Maps para web — asi que la key DEBE estar restringida por HTTP referrer
// (dominio del panel) y por APIs habilitadas en Google Cloud.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Centro por defecto: Bolivia (Santa Cruz).
const CENTRO_DEFAULT = { lat: -17.78, lng: -63.18 };

const VERDE_ACTIVA = "#16a34a";
const GRIS_INACTIVA = "#9ca3af";

// Icono del marcador: mismo criterio visual que antes (circulo de color con
// el auto adentro). Va como data URI porque los marcadores clasicos de Google
// toman una imagen, no un nodo del DOM.
function iconoMarcador(activa) {
  const color = activa ? VERDE_ACTIVA : GRIS_INACTIVA;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
<circle cx="18" cy="18" r="15" fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
<g transform="translate(10 10) scale(0.66)" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
</g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function contenidoInfoWindow(nombre, activa, telefono, lat, lng) {
  return (
    `<div style="font-family:sans-serif;font-size:13px;">` +
    `<strong>${nombre}</strong><br/>` +
    `<span style="color:${activa ? VERDE_ACTIVA : GRIS_INACTIVA};font-weight:600;">` +
    `${activa ? "● Activa" : "○ Inactiva"}</span>` +
    (telefono ? `<br/>${telefono}` : "") +
    `<br/><span style="color:#888;font-size:11px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>` +
    `</div>`
  );
}

export function MapaConductores() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const gmapsRef = useRef(null); // namespace google.maps ya cargado
  const markersRef = useRef({}); // uid -> { marker, info }
  const infoRef = useRef({}); // uid -> { nombre, telefono } (de Firestore)
  const abiertoRef = useRef(null); // InfoWindow abierta (Google permite una)
  const fittedRef = useRef(false);

  const [conductores, setConductores] = useState([]); // [{uid, lat, lng, activa}]
  const [mapReady, setMapReady] = useState(false);
  const [nombres, setNombres] = useState({}); // uid -> {nombre, telefono}

  // Inicializar mapa una sola vez.
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    if (!GOOGLE_MAPS_API_KEY) {
      console.error(
        "Falta VITE_GOOGLE_MAPS_API_KEY: el mapa de conductoras no se puede inicializar."
      );
      return;
    }

    let cancelado = false;

    // API funcional del loader (v2). La clase Loader de v1 ya no existe:
    // instanciarla tira "The Loader class is no longer available".
    setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly" });

    importLibrary("maps")
      .then((mapsLib) => {
        if (cancelado || !mapContainer.current) return;

        // Marker, InfoWindow, LatLngBounds y event se toman del namespace
        // global que queda disponible una vez cargada la libreria.
        const gmaps = window.google.maps;
        gmapsRef.current = gmaps;

        const map = new mapsLib.Map(mapContainer.current, {
          center: CENTRO_DEFAULT,
          zoom: 5,
          // Equivalente al NavigationControl de antes; sacamos los controles
          // que no aportan en un panel de flota.
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        setMapReady(true);
      })
      .catch((e) => {
        console.error("No se pudo cargar Google Maps:", e);
      });

    return () => {
      cancelado = true;
      // Google Maps no tiene un destroy(): se sueltan las referencias y se
      // limpian los marcadores para no dejarlos colgados.
      for (const uid of Object.keys(markersRef.current)) {
        markersRef.current[uid].marker.setMap(null);
      }
      markersRef.current = {};
      abiertoRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Nombres/telefonos de los taxistas (Firestore).
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "taxistas"), (snap) => {
      const info = {};
      snap.forEach((d) => {
        const data = d.data() || {};
        const p = data.perfilTaxista || {};
        info[d.id] = {
          nombre: p.nombre || p.name || data.nombre || "Conductora",
          telefono: p.telefonoCompleto || p.telefono || "",
        };
      });
      infoRef.current = info;
      setNombres(info);
    });
    return () => unsub();
  }, []);

  // Posiciones en vivo desde RTDB (pasajeros con modo taxista).
  useEffect(() => {
    const rtdb = getDatabase();
    const unsub = onValue(ref(rtdb, "pasajeros"), (snap) => {
      const val = snap.val() || {};
      const list = [];
      for (const uid of Object.keys(val)) {
        const t = val[uid] || {};
        if (t.modo !== "taxista") continue;
        const lat = Number(t.lat ?? t.latitude);
        const lng = Number(t.lng ?? t.longitude);
        if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) continue;
        // "Online" = activo y con posición reciente (< 2 min). Si no hay
        // updatedAt (datos viejos), no se considera fresca.
        const updatedAt = Number(t.updatedAt || 0);
        const fresca = updatedAt > 0 && Date.now() - updatedAt < 120000;
        list.push({ uid, lat, lng, activa: t.activo === true && fresca });
      }
      setConductores(list);
    });
    return () => unsub();
  }, []);

  // Pintar / actualizar marcadores cuando hay datos y mapa listo.
  useEffect(() => {
    const map = mapRef.current;
    const gmaps = gmapsRef.current;
    if (!map || !gmaps || !mapReady) return;

    const vivos = new Set();
    for (const c of conductores) {
      vivos.add(c.uid);
      const info = infoRef.current[c.uid] || {};
      const nombre = info.nombre || "Conductora";
      const html = contenidoInfoWindow(
        nombre,
        c.activa,
        info.telefono,
        c.lat,
        c.lng
      );
      const posicion = { lat: c.lat, lng: c.lng };

      const existente = markersRef.current[c.uid];
      if (existente) {
        existente.marker.setPosition(posicion);
        existente.marker.setIcon(iconoMarcador(c.activa));
        existente.info.setContent(html);
      } else {
        const marker = new gmaps.Marker({
          map,
          position: posicion,
          icon: iconoMarcador(c.activa),
          title: nombre,
        });
        const infoWindow = new gmaps.InfoWindow({ content: html });
        marker.addListener("click", () => {
          // Google no cierra sola la anterior.
          abiertoRef.current?.close();
          infoWindow.open({ map, anchor: marker });
          abiertoRef.current = infoWindow;
        });
        markersRef.current[c.uid] = { marker, info: infoWindow };
      }
    }

    // Eliminar marcadores de conductoras que ya no están.
    for (const uid of Object.keys(markersRef.current)) {
      if (!vivos.has(uid)) {
        markersRef.current[uid].marker.setMap(null);
        delete markersRef.current[uid];
      }
    }

    // Ajustar la cámara a todas las conductoras (solo la primera vez).
    if (!fittedRef.current && conductores.length > 0) {
      ajustarAConductoras(conductores);
      fittedRef.current = true;
    }
  }, [conductores, mapReady]);

  // Encuadra el mapa sobre todas las conductoras con posición.
  const ajustarAConductoras = (lista) => {
    const map = mapRef.current;
    const gmaps = gmapsRef.current;
    if (!map || !gmaps || lista.length === 0) return;

    const bounds = new gmaps.LatLngBounds();
    lista.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    map.fitBounds(bounds, 80);

    // fitBounds con un solo punto se va a zoom máximo: lo acotamos igual que
    // antes (maxZoom 14).
    gmaps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > 14) map.setZoom(14);
    });
  };

  const activas = conductores.filter((c) => c.activa).length;

  const reencuadrar = () => ajustarAConductoras(conductores);

  const centrarEn = (c) => {
    const map = mapRef.current;
    if (!map || !c || !isFinite(c.lat) || !isFinite(c.lng)) return;
    map.panTo({ lat: c.lat, lng: c.lng });
    map.setZoom(16);
    const entry = markersRef.current[c.uid];
    if (entry) {
      abiertoRef.current?.close();
      entry.info.open({ map, anchor: entry.marker });
      abiertoRef.current = entry.info;
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Mapa de conductoras</h1>
          <p className="text-sm text-gray-500">
            Vista en tiempo real de la flota
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-lg font-bold">{conductores.length}</span>
            <span className="text-sm text-gray-500">en mapa</span>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-green-600" />
            <span className="text-lg font-bold text-green-600">{activas}</span>
            <span className="text-sm text-gray-500">activas</span>
          </div>
          <button
            onClick={reencuadrar}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-green-600 hover:to-green-700 transition"
            title="Centrar en todas"
          >
            <RefreshCw className="w-4 h-4" /> Centrar
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Activa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Inactiva
        </span>
        {conductores.length === 0 && (
          <span className="ml-2 text-amber-600 inline-flex items-center gap-1.5">
            <Car className="w-4 h-4" /> Sin conductoras con ubicación activa ahora
          </span>
        )}
      </div>

      <div className="flex-1 min-h-[400px] relative">
        <div
          ref={mapContainer}
          className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200"
        />

        {/* Panel de conductoras (derecha) — clic = centrar en el mapa */}
        <div className="absolute top-3 right-3 w-64 max-h-[calc(100%-24px)] overflow-y-auto bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 z-10">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 sticky top-0 bg-white/95">
            Conductoras ({conductores.length})
          </div>
          {conductores.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">
              Ninguna con ubicación ahora.
            </div>
          ) : (
            [...conductores]
              .sort((a, b) => (b.activa ? 1 : 0) - (a.activa ? 1 : 0))
              .map((c) => (
                <button
                  key={c.uid}
                  onClick={() => centrarEn(c)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                  title="Centrar en el mapa"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      c.activa ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {nombres[c.uid]?.nombre || "Conductora"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {c.activa ? "Activa" : "Inactiva"}
                    </div>
                  </div>
                  <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
