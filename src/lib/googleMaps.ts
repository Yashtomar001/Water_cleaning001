// Loads the Google Maps JS API with an API key from env.
// The script is also loaded in index.html for reliability; this function
// waits for it to be ready and falls back to dynamic loading if needed.

let loadPromise: Promise<typeof google.maps> | null = null;

export function getMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    // Already loaded (e.g. via index.html script tag)
    if (typeof google !== 'undefined' && google.maps) {
      resolve(google.maps);
      return;
    }

    const key = getMapsApiKey();
    if (!key) {
      reject(new Error('NO_API_KEY'));
      return;
    }

    // Wait for the script tag in index.html to finish loading
    const checkLoaded = () => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve(google.maps);
        return true;
      }
      return false;
    };

    // Poll for up to 10 seconds in case the defer script is still loading
    let attempts = 0;
    const interval = setInterval(() => {
      if (checkLoaded()) {
        clearInterval(interval);
      } else if (++attempts > 100) {
        clearInterval(interval);
        // Fall back to dynamic loading
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
      }
    }, 100);
  });

  return loadPromise;
}

export type { };
