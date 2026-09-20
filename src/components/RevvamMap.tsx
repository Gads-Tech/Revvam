"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    maplibregl?: any;
  }
}

type Marker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  radiusMeters?: number;
  exactLocation?: boolean;
  ghostMode?: boolean;
};

type Props = {
  userLocation: { latitude: number; longitude: number } | null;
  userImage: string | null;
  markers: Marker[];
  onOfferHelp?: (emergencyId: string) => void;
};

export default function RevvamMap({ userLocation, userImage, markers, onOfferHelp }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const markersRef = useRef<any[]>([]);
  const radiusIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const cssId = "revvam-maplibre-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@5.7.0/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    const start = () => {
      if (!containerRef.current || !window.maplibregl || mapRef.current) return;
      const center = userLocation
        ? [userLocation.longitude, userLocation.latitude]
        : [-0.15, 5.60];

      const map = new window.maplibregl.Map({
        container: containerRef.current,
        maxZoom: 19,
        minZoom: 2,
        // Vector map foundation: OpenFreeMap uses OpenStreetMap data and
        // gives us a MapLibre-native style we can customize for Revvam.
        style: "https://tiles.openfreemap.org/styles/bright",
        center,
        zoom: userLocation ? 14 : 6,
        pitch: 52,
        bearing: 0,
        maxPitch: 70,
        dragRotate: true,
        touchPitch: true,
        attributionControl: true,
      });

      map.addControl(new window.maplibregl.NavigationControl(), "bottom-right");

      map.on("load", () => {
        const style = map.getStyle();
        const buildingSource = Object.keys(style.sources).find((id) => style.sources[id]?.type === "vector");
        if (buildingSource && !map.getLayer("revvam-3d-buildings")) {
          try {
            const layers = style.layers || [];
            const buildingLayer = layers.find(
              (layer: any) =>
                (layer.type === "fill-extrusion" || layer.type === "fill") &&
                typeof layer["source-layer"] === "string" &&
                /building/i.test(layer["source-layer"]),
            );
            const sourceLayer = buildingLayer?.["source-layer"];
            if (sourceLayer) {
              map.addLayer({
                id: "revvam-3d-buildings",
                type: "fill-extrusion",
                source: buildingSource,
                "source-layer": sourceLayer,
                minzoom: 13,
                paint: {
                  "fill-extrusion-color": [
                    "interpolate", ["linear"], ["zoom"],
                    13, "#11151b", 16, "#1b222b", 19, "#252e39",
                  ],
                  "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
                  "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                  "fill-extrusion-opacity": 0.94,
                  "fill-extrusion-vertical-gradient": true,
                },
              });
            }
          } catch {}
        }

        // Darken the map's major road surfaces where the upstream style exposes them.
        try {
          const roadLayers = (map.getStyle().layers || []).filter(
            (layer: any) => layer.type === "line" && typeof layer.id === "string" &&
              /(road|street|highway|motorway|trunk)/i.test(layer.id),
          );
          roadLayers.forEach((layer: any) => {
            if (map.getLayer(layer.id)) {
              map.setPaintProperty(layer.id, "line-color", [
                "match", ["get", "class"],
                "motorway", "#e8edf3",
                "trunk", "#c9d0d8",
                "primary", "#aab3bd",
                "secondary", "#8c97a3",
                "tertiary", "#6f7a86",
                "#56616d",
              ]);
              map.setPaintProperty(layer.id, "line-opacity", 0.9);
            }
          });
        } catch {}
      });
      mapRef.current = map;

      map.on("load", () => {
        if (!userLocation) return;
        map.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: 16,
          pitch: 55,
          duration: 1200,
        });
      });
    };

    if (window.maplibregl) {
      start();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@5.7.0/dist/maplibre-gl.js";
      script.async = true;
      script.onload = start;
      document.head.appendChild(script);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const focusLocation = () => {
    if (!mounted || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = [position.coords.longitude, position.coords.latitude];
        mapRef.current?.flyTo({
          center,
          zoom: 17,
          pitch: 55,
          duration: 1400,
          essential: true,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = userLocation && [userLocation.longitude, userLocation.latitude];

    if (center) {
      map.flyTo({ center, zoom: 16, pitch: 55, duration: 1000 });
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    radiusIdsRef.current.forEach((id) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
      try { if (map.getSource(id)) map.removeSource(id); } catch {}
    });
    radiusIdsRef.current = [];

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "revvam-user-marker";
      el.style.cssText = "width:92px;height:92px;border-radius:50%;padding:4px;background:linear-gradient(135deg,#fff 0%,#ef4444 48%,#7f1d1d 100%);box-shadow:0 0 0 5px rgba(239,68,68,.20),0 0 34px rgba(239,68,68,.52);overflow:hidden;box-sizing:border-box;";
      if (userImage) {
        const img = document.createElement("img");
        img.src = userImage;
        img.alt = "";
        img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid rgba(0,0,0,.55);";
        el.appendChild(img);
      } else {
        el.textContent = "YOU";
        el.style.display = "grid";
        el.style.placeItems = "center";
        el.style.color = "white";
        el.style.fontWeight = "800";
        el.style.fontSize = "12px";
      }
      const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "revvam-emergency-marker";
      el.style.cssText = "width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#ef4444;border:3px solid #fff;color:#fff;font-weight:900;font-size:22px;box-shadow:0 0 0 4px rgba(239,68,68,.16),0 0 24px rgba(239,68,68,.58);box-sizing:border-box;";
      el.textContent = "!";
      const popupText = "<div style=\"min-width:190px\"><strong>⚠ " + m.title + "</strong><br/><span>" + (m.description ?? "") + "</span><br/><small>" + (m.exactLocation ? "Exact live location" : "Approximate location") + " · " + (m.radiusMeters ?? 500) + "m radius</small><br/><button type=\"button\" data-revvam-offer=\"" + m.id + "\" style=\"margin-top:8px;width:100%;border:0;border-radius:10px;background:#ef4444;color:white;padding:8px;font-weight:700;cursor:pointer\">Offer to help</button></div>";
      const popup = new window.maplibregl.Popup({ offset: 22 }).setHTML(popupText);
      popup.on("open", () => {
        const node = popup.getElement()?.querySelector("[data-revvam-offer]");
        node?.addEventListener("click", () => onOfferHelp?.(m.id));
      });
      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([m.longitude, m.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);

      if (m.radiusMeters) {
        const sourceId = "emergency-radius-" + m.id;
        if (map.getSource(sourceId)) {
          try { if (map.getLayer(sourceId)) map.removeLayer(sourceId); } catch {}
          try { map.removeSource(sourceId); } catch {}
        }
        radiusIdsRef.current.push(sourceId);
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
            properties: {},
          },
        });
        map.addLayer({
          id: sourceId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 12, 8, 14, 22, 16, 55, 18, 120],
            "circle-color": "#ef4444",
            "circle-opacity": 0.08,
            "circle-stroke-color": "#ef4444",
            "circle-stroke-opacity": 0.35,
            "circle-stroke-width": 2,
          },
        });
      }
    });

  }, [userLocation, userImage, markers, onOfferHelp]);

  return (
    <div ref={containerRef} className="relative h-[320px] w-full overflow-hidden rounded-[1.7rem] border border-white/[0.10] bg-[#05070b] shadow-[0_24px_70px_rgba(0,0,0,.45)] sm:h-[400px]">
      <button
        type="button"
        onClick={focusLocation}
        disabled={locating}
        aria-label="Focus on my location"
        title="Focus on my location"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/75 text-white shadow-2xl backdrop-blur-xl transition hover:border-red-400/50 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/[0.10] bg-[#05070b]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/60 shadow-[0_0_24px_rgba(239,68,68,.12)] backdrop-blur-xl">
        Revvam World · Open Map
      </div>
    </div>
  );
}
