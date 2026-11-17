// Loads the Google Maps JS API dynamically with an API key from env.
// VITE_GOOGLE_MAPS_API_KEY must be set in .env for the map to work.

let loadPromise: Promise<typeof google.maps> | null = null;

export function getMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise;
  const key = getMapsApiKey();

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps) {
      resolve(google.maps);
      return;
    }

    if (!key) {
      reject(new Error('NO_API_KEY'));
      return;
    }

    const callbackName = '__gmaps_init_' + Date.now();
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      resolve(google.maps);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps. Check your API key and network.'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export type { };
