"use client";

import { useEffect, useRef, useState } from "react";

type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

type ViewMode = "globe" | "map";

export default function EmergencyMap({
  markers,
  userLocation,
  userImage,
}: {
  markers: MapMarker[];
  userLocation: { latitude: number; longitude: number } | null;
  userImage?: string | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [mode, setMode] = useState<ViewMode>("globe");
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!mapRef.current || !key) return;

    let cancelled = false;

    const loadGoogle = async () => {
      if (window.google?.maps) return;

      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-revvam-google-maps]',
      );

      if (existing) {
        await new Promise<void>((resolve, reject) => {
          if (window.google?.maps) {
            resolve();
            return;
          }
          const onLoad = () => resolve();
          const onError = () => reject(new Error("Google Maps failed to load."));
          existing.addEventListener("load", onLoad, { once: true });
          existing.addEventListener("error", onError, { once: true });
        });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=alpha`;
      script.async = true;
      script.defer = true;
      script.dataset.revvamGoogleMaps = "true";
      scriptRef.current = script;

      await new Promise<void>((resolve, reject) => {
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
        document.head.appendChild(script);
      });
    };

    const createMap = () => {
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

      mapInstanceRef.current = map;

      if (userLocation) {
        new window.google.maps.Marker({
          map,
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          title: "Your location",
          icon: userImage
            ? {
                url: userImage,
                scaledSize: new window.google.maps.Size(42, 42),
                anchor: new window.google.maps.Point(21, 21),
              }
            : {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#ef4444",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
        });
      }

      markers.forEach((marker) => {
        const pin = new window.google.maps.Marker({
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const info = new window.google.maps.InfoWindow({
          content: `<div style="color:#111;min-width:180px;padding:4px"><strong>${marker.title}</strong>${marker.description ? `<br/><span>${marker.description}</span>` : ""}</div>`,
        });

        pin.addListener("click", () => info.open({ map, anchor: pin }));
      });
    };

    const createGlobe = async () => {
      if (cancelled || !mapRef.current || !window.google?.maps) return;

      const { Map3DElement, Marker3DElement } =
        await window.google.maps.importLibrary("maps3d");

      if (cancelled || !mapRef.current) return;

      mapRef.current.innerHTML = "";

      const center = userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude, altitude: 0 }
        : markers[0]
          ? { lat: markers[0].latitude, lng: markers[0].longitude, altitude: 0 }
          : { lat: 5.6037, lng: -0.1870, altitude: 0 };

      const globe = new Map3DElement({
        center,
        range: userLocation || markers.length ? 9000 : 18000000,
        tilt: userLocation || markers.length ? 62 : 18,
        heading: 0,
        mode: "ROADMAP",
        defaultUIHidden: false,
        gestureHandling: "GREEDY",
      });

      globe.style.width = "100%";
      globe.style.height = "100%";
      globe.style.display = "block";
      globe.style.background = "#02040a";

      mapRef.current.appendChild(globe);
      globeRef.current = globe;

      if (userLocation) {
        const you = new Marker3DElement({
          position: { lat: userLocation.latitude, lng: userLocation.longitude, altitude: 50 },
          label: userImage ? undefined : "YOU",
          drawsWhenOccluded: true,
          altitudeMode: "CLAMP_TO_GROUND",
          altitudeMode: "CLAMP_TO_GROUND",
        });
        if (userImage) {
          you.innerHTML = \`<img src="${userImage}" alt="" style="width:42px;height:42px;border-radius:999px;object-fit:cover;border:2px solid #fff;box-shadow:0 0 0 4px rgba(239,68,68,.28),0 0 24px rgba(239,68,68,.55);" />\`;
        }
        globe.appendChild(you);
      }

      markers.forEach((marker) => {
        const pin = new Marker3DElement({
          position: { lat: marker.latitude, lng: marker.longitude, altitude: 50 },
          label: marker.title,
          drawsWhenOccluded: true,
          altitudeMode: "CLAMP_TO_GROUND",
        });

        pin.addEventListener("gmp-click", () => {
          const nextCenter = {
            lat: marker.latitude,
            lng: marker.longitude,
            altitude: 300,
          };
          globe.flyCameraTo({
            endCameraPosition: {
              center: nextCenter,
              range: 2500,
              tilt: 62,
              heading: 0,
            },
          });
        });

        globe.appendChild(pin);
      });
    };

    const init = async () => {
      try {
        await loadGoogle();
        if (cancelled) return;
        setReady(true);

        if (mode === "globe") {
          await createGlobe();
        } else {
          createMap();
        }
      } catch {
        if (!cancelled) setReady(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
      mapInstanceRef.current = null;
      globeRef.current = null;
    };
  }, [mode, markers, userLocation]);

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (mode === "map" && mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: next.latitude, lng: next.longitude });
          mapInstanceRef.current.setZoom(16);
        }

        if (mode === "globe" && globeRef.current) {
          globeRef.current.flyCameraTo({
            endCameraPosition: {
              center: {
                lat: next.latitude,
                lng: next.longitude,
                altitude: 0,
              },
              range: 1800,
              tilt: 62,
              heading: 0,
            },
          });
        }

        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

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

  return (
    <div className="relative h-[430px] w-full overflow-hidden bg-[#02040a] sm:h-[560px]">
      <button
        type="button"
        onClick={locateMe}
        disabled={locating || !ready}
        aria-label="Locate me"
        title="Locate me"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-black/75 text-white/80 shadow-2xl backdrop-blur-xl transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${locating ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" />
          <path strokeLinecap="round" d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
        </svg>
      </button>

      <div
        ref={mapRef}
        className="absolute inset-0"
        aria-label={mode === "globe" ? "Revvam interactive 3D globe" : "Revvam interactive map"}
      />

      <div className="absolute left-4 top-4 z-10 flex rounded-full border border-white/[0.12] bg-black/70 p-1 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMode("globe")}
          className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${mode === "globe" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-white/45 hover:text-white"}`}
        >
          Globe
        </button>
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${mode === "map" ? "bg-white text-black" : "text-white/45 hover:text-white"}`}
        >
          Map
        </button>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#02040a]">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Loading Revvam map</p>
          </div>
        </div>
      )}
    </div>
  );
}
