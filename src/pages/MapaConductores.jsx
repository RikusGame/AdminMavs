import { useEffect, useRef, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Car, CircleDot, RefreshCw, Users } from "lucide-react";
import { db } from "../config/firebase";

// Token de Mapbox (cuenta mujeresalvolante, mismo que la app). Va por env:
// el repo es publico y GitHub bloquea el push si el token queda en el codigo.
// Definir VITE_MAPBOX_TOKEN en el .env local y en el entorno de build.
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Centro por defecto: Bolivia (Santa Cruz).
const CENTRO_DEFAULT = [-63.18, -17.78];

function crearElementoMarcador(activa) {
  const el = document.createElement("div");
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.borderRadius = "50%";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.color = "#fff";
  el.style.fontSize = "15px";
  el.style.fontWeight = "bold";
  el.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.4)";
  el.style.cursor = "pointer";
  el.style.background = activa ? "#16a34a" : "#9ca3af";
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
  return el;
}

export function MapaConductores() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // uid -> { marker, popup }
  const infoRef = useRef({}); // uid -> { nombre, telefono } (de Firestore)
  const fittedRef = useRef(false);

  const [conductores, setConductores] = useState([]); // [{uid, lat, lng, activa}]
  const [mapReady, setMapReady] = useState(false);
  const [nombres, setNombres] = useState({}); // uid -> {nombre, telefono}

  // Inicializar mapa una sola vez.
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    if (!mapboxgl.accessToken) {
      console.error(
        "Falta VITE_MAPBOX_TOKEN: el mapa de conductoras no se puede inicializar."
      );
      return;
    }
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: CENTRO_DEFAULT,
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    // El contenedor puede no tener tamaño definitivo al montar (flex/layout) →
    // forzamos resize tras el primer layout para que el mapa renderice.
    setTimeout(() => map.resize(), 300);
    setTimeout(() => map.resize(), 900);
    return () => {
      map.remove();
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
    if (!map || !mapReady) return;

    const vivos = new Set();
    for (const c of conductores) {
      vivos.add(c.uid);
      const info = infoRef.current[c.uid] || {};
      const nombre = info.nombre || "Conductora";
      const popupHtml =
        `<div style="font-family:sans-serif;font-size:13px;">` +
        `<strong>${nombre}</strong><br/>` +
        `<span style="color:${c.activa ? "#16a34a" : "#9ca3af"};font-weight:600;">` +
        `${c.activa ? "● Activa" : "○ Inactiva"}</span>` +
        (info.telefono ? `<br/>${info.telefono}` : "") +
        `<br/><span style="color:#888;font-size:11px;">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</span>` +
        `</div>`;

      const existente = markersRef.current[c.uid];
      if (existente) {
        existente.marker.setLngLat([c.lng, c.lat]);
        existente.popup.setHTML(popupHtml);
        // color según estado
        existente.marker.getElement().style.background = c.activa
          ? "#16a34a"
          : "#9ca3af";
      } else {
        const el = crearElementoMarcador(c.activa);
        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml);
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([c.lng, c.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current[c.uid] = { marker, popup };
      }
    }

    // Eliminar marcadores de conductoras que ya no están.
    for (const uid of Object.keys(markersRef.current)) {
      if (!vivos.has(uid)) {
        markersRef.current[uid].marker.remove();
        delete markersRef.current[uid];
      }
    }

    // Ajustar la cámara a todas las conductoras (solo la primera vez).
    if (!fittedRef.current && conductores.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      conductores.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
      fittedRef.current = true;
    }
  }, [conductores, mapReady]);

  const activas = conductores.filter((c) => c.activa).length;

  const reencuadrar = () => {
    const map = mapRef.current;
    if (!map || conductores.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    conductores.forEach((c) => bounds.extend([c.lng, c.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
  };

  const centrarEn = (c) => {
    const map = mapRef.current;
    if (!map || !c || !isFinite(c.lat) || !isFinite(c.lng)) return;
    map.flyTo({ center: [c.lng, c.lat], zoom: 16, duration: 800 });
    const entry = markersRef.current[c.uid];
    if (entry?.popup && entry?.marker && !entry.popup.isOpen()) {
      try {
        entry.marker.togglePopup();
      } catch (_) {
        /* noop */
      }
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

export default MapaConductores;
