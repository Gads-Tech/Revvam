"use client";

import { useEffect, useRef } from "react";

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
};

type Props = {
  userLocation: { latitude: number; longitude: number } | null;
  userImage: string | null;
  markers: Marker[];
};

export default function RevvamMap({ userLocation, userImage, markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
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
        style: "https://tiles.openfreemap.org/styles/liberty",
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

    document.querySelectorAll(".revvam-user-marker").forEach((el) => el.remove());
    document.querySelectorAll(".revvam-emergency-marker").forEach((el) => el.remove());

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "revvam-user-marker";
      el.style.cssText = "width:74px;height:74px;border-radius:50%;padding:4px;background:linear-gradient(135deg,#fff,#ef4444 50%,#8b0000);box-shadow:0 0 0 5px rgba(239,68,68,.22),0 0 30px rgba(239,68,68,.6);overflow:hidden;box-sizing:border-box;";
      if (userImage) {
        const img = document.createElement("img");
        img.src = userImage;
        img.alt = "";
        img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;";
        el.appendChild(img);
      } else {
        el.textContent = "YOU";
        el.style.display = "grid";
        el.style.placeItems = "center";
        el.style.color = "white";
        el.style.fontWeight = "800";
        el.style.fontSize = "11px";
      }
      new window.maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    }

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "revvam-emergency-marker";
      el.style.cssText = "width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 18px rgba(239,68,68,.8);";
      new window.maplibregl.Marker({ element: el })
        .setLngLat([m.longitude, m.latitude])
        .setPopup(new window.maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${m.title}</strong><br/><span>${m.description ?? ""}</span>`))
        .addTo(map);
    });
  }, [userLocation, userImage, markers]);

  return (
    <div ref={containerRef} className="relative h-[430px] w-full overflow-hidden sm:h-[560px]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-red-500/20 bg-[#05070b]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-red-100/70 shadow-[0_0_24px_rgba(239,68,68,.12)] backdrop-blur-xl">
        Revvam World · Open Map
      </div>
    </div>
  );
}
