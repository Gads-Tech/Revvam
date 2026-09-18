"use client";

import { useEffect, useRef } from "react";

type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
};

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function EmergencyMap({
  markers,
  userLocation,
}: {
  markers: MapMarker[];
  userLocation: { latitude: number; longitude: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!mapRef.current || !key) return;

    let cancelled = false;

    const init = () => {
      if (cancelled || !mapRef.current || !window.google?.maps) return;

      const center = userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude }
        : markers[0]
          ? { lat: markers[0].latitude, lng: markers[0].longitude }
          : { lat: 5.6037, lng: -0.1870 };

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: userLocation || markers.length ? 13 : 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: true,
        backgroundColor: "#050505",
        styles: [
          { elementType: "geometry", stylers: [{ color: "#111111" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#777777" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#111111" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#242424" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#151515" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#080808" }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#151515" }] },
          { featureType: "transit", elementType: "geometry", stylers: [{ color: "#171717" }] },
        ],
      });

      if (userLocation) {
        new window.google.maps.Marker({
          map,
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          title: "Your location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#60a5fa",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      }

      markers.forEach((marker) => {
        const pin = new window.google!.maps.Marker({
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.title,
          icon: {
            path: window.google!.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const info = new window.google!.maps.InfoWindow({
          content: `<div style="color:#111;min-width:180px;padding:4px"><strong>${marker.title}</strong>${marker.description ? `<br/><span>${marker.description}</span>` : ""}</div>`,
        });

        pin.addListener("click", () => info.open({ map, anchor: pin }));
      });
    };

    if (window.google?.maps) {
      init();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-revvam-google-maps]');
    if (existing) {
      existing.addEventListener("load", init);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", init);
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true;
    script.defer = true;
    script.dataset.revvamGoogleMaps = "true";
    script.addEventListener("load", init);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", init);
    };
  }, [markers, userLocation]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex min-h-[380px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.10),transparent_55%)] p-8 text-center">
        <div className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Google Maps</p>
          <h2 className="mt-2 text-lg font-bold">Map key required</h2>
          <p className="mt-2 text-sm leading-6 text-white/30">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file, then restart the Next.js server.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[380px] w-full bg-[#080808] sm:h-[460px]" aria-label="Nearby emergency map" />;
}
