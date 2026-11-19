import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { fetchLakesWithDetails } from '@/lib/dataAccess';
import type { LakeWithDetails, LakeStatus } from '@/lib/supabase';
import { LoadingState, ErrorState, statusColor, statusBadge, StateTag } from './ui';
import { Waves, Filter, Layers, MapPin, Crosshair, AlertTriangle, KeyRound, ExternalLink } from 'lucide-react';
import { loadGoogleMaps, getMapsApiKey } from '@/lib/googleMaps';

const INDIA_CENTER = { lat: 22.5, lng: 80.0 };
const INDIA_ZOOM = 5;

export function RiskMap() {
  const [lakes, setLakes] = useState<LakeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LakeStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selected, setSelected] = useState<LakeWithDetails | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Circle[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLakesWithDetails();
      setLakes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return lakes.filter((l) => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterType !== 'all' && l.type !== filterType) return false;
      return true;
    });
  }, [lakes, filterStatus, filterType]);

  // Initialize the map once data is loaded
  useEffect(() => {
    if (loading || error || !mapContainerRef.current) return;

    const apiKey = getMapsApiKey();
    if (!apiKey) {
      setError('NO_API_KEY');
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: INDIA_CENTER,
            zoom: INDIA_ZOOM,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
              { featureType: 'water', stylers: [{ color: '#a6c8ff' }] },
              { featureType: 'landscape', stylers: [{ color: '#f5f5f0' }] },
            ],
          });

          infoWindowRef.current = new google.maps.InfoWindow();

          // Geolocation button
          const locationButton = document.createElement('button');
          locationButton.textContent = 'Pan to Current Location';
          locationButton.className = 'gm-geolocation-btn';
          (locationButton as HTMLButtonElement).style.cssText = `
            background: white; border: 1px solid #cbd5e1; border-radius: 8px;
            padding: 8px 14px; margin: 10px; cursor: pointer; font-size: 13px;
            font-weight: 600; color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            transition: background 0.2s;
          `;
          locationButton.addEventListener('mouseenter', () => {
            (locationButton as HTMLButtonElement).style.background = '#f1f5f9';
          });
          locationButton.addEventListener('mouseleave', () => {
            (locationButton as HTMLButtonElement).style.background = 'white';
          });
          locationButton.addEventListener('click', () => handleLocate());

          mapRef.current.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

          // Trigger resize in case the container wasn't fully sized at init
          google.maps.event.trigger(mapRef.current, 'resize');
        }

        // Render markers
        renderMarkers();
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load Google Maps');
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error]);

  // Re-render markers when filters change
  useEffect(() => {
    if (mapRef.current && infoWindowRef.current) {
      renderMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const radiusFor = (lake: LakeWithDetails): number => {
    const pred = lake.latest_prediction;
    if (pred) return 6000 + pred.bloom_probability * 14000;
    return 6000;
  };

  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !infoWindowRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const infoWindow = infoWindowRef.current;

    filtered.forEach((lake) => {
      const color = statusColor(lake.status);
      const radius = radiusFor(lake);
      const pred = lake.latest_prediction;

      const lat = Number(lake.lat);
      const lng = Number(lake.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const circle = new google.maps.Circle({
        map: mapRef.current!,
        center: { lat, lng },
        radius: radius,
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: color,
        fillOpacity: 0.5,
      });

      circle.addListener('click', () => {
        setSelected(lake);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(8);

        const predHtml = pred ? `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <span style="color:#64748b">Bloom Probability</span>
              <strong style="color:${color}">${Math.round(pred.bloom_probability * 100)}%</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;">
              <span style="color:#64748b">Intensity</span>
              <strong style="text-transform:capitalize">${pred.predicted_intensity}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;">
              <span style="color:#64748b">Chlorophyll-a</span>
              <strong>${(pred.contributing_factors as Record<string, number>)?.chlorophyll_a ?? '—'} µg/L</strong>
            </div>
          </div>` : '';

        infoWindow.setContent(`
          <div style="min-width:200px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:15px;color:#0f172a">${lake.name}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">${lake.district ? lake.district + ', ' : ''}${lake.state}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
              <span style="display:inline-flex;align-items:center;gap:4px;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;background:${color}20;color:${color}">
                <span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>
                ${lake.status}
              </span>
              <span style="font-size:11px;color:#64748b;text-transform:capitalize">${lake.type}</span>
            </div>
            ${predHtml}
          </div>
        `);
        infoWindow.setPosition({ lat, lng });
        infoWindow.open(mapRef.current!);
      });

      // Hover tooltip via title
      circle.set('title', `${lake.name} · ${lake.status}`);

      markersRef.current.push(circle);
    });
  }, [filtered]);

  const handleLocate = useCallback(() => {
    setLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support geolocation.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (infoWindowRef.current && mapRef.current) {
          infoWindowRef.current.setPosition(pos);
          infoWindowRef.current.setContent(
            '<div style="font-family:Inter,sans-serif;font-weight:600;color:#0f172a;">Your location</div>'
          );
          infoWindowRef.current.open(mapRef.current);
          mapRef.current.setCenter(pos);
          mapRef.current.setZoom(10);
        }
        setLocating(false);
      },
      () => {
        setLocationError('The Geolocation service failed. Please check your browser permissions.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  if (loading) return <LoadingState message="Loading map data..." />;

  // Special error state for missing API key
  if (error === 'NO_API_KEY') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h2 className="text-xl font-display font-bold">Spatial Risk Map</h2>
          <p className="text-sm text-ink-500">Google Maps integration requires an API key</p>
        </div>
        <div className="card p-8 md:p-12">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-warning-100 flex items-center justify-center mb-4">
              <KeyRound className="w-7 h-7 text-warning-600" />
            </div>
            <h3 className="text-lg font-display font-bold text-ink-900 mb-2">Google Maps API Key Required</h3>
            <p className="text-sm text-ink-500 leading-relaxed mb-5">
              To display the interactive risk map, you need a free Google Maps JavaScript API key.
              Here's how to set it up:
            </p>
            <ol className="text-sm text-ink-600 text-left space-y-2.5 w-full max-w-md mb-5">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">1</span>
                <span>Go to the <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a> and create a project (free).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">2</span>
                <span>Enable the <strong>Maps JavaScript API</strong> under APIs &amp; Services.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">3</span>
                <span>Create a credential (API key) under Credentials.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">4</span>
                <span>Add it to your <code className="bg-ink-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> file as:
                  <code className="block bg-ink-100 px-3 py-2 rounded-lg text-xs font-mono mt-1.5 text-ink-700">VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">5</span>
                <span>Restart the dev server and reload this page.</span>
              </li>
            </ol>
            <p className="text-xs text-ink-400">
              Google offers a generous free tier ($200/month credit) — no payment required to start.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold">Spatial Risk Map</h2>
          <p className="text-sm text-ink-500">{filtered.length} monitoring sites across India</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Layers className="w-4 h-4" />
          <span>Circle size = bloom probability · Color = risk status</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-600">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LakeStatus | 'all')}
          className="input w-auto py-1.5 text-sm"
        >
          <option value="all">All Status</option>
          <option value="safe">Safe</option>
          <option value="watch">Watch</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input w-auto py-1.5 text-sm"
        >
          <option value="all">All Types</option>
          <option value="lake">Lake</option>
          <option value="river">River</option>
          <option value="reservoir">Reservoir</option>
          <option value="wetland">Wetland</option>
        </select>
        <button
          onClick={handleLocate}
          disabled={locating}
          className="btn-ghost text-sm py-1.5 flex items-center gap-2"
        >
          <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Locating...' : 'My Location'}
        </button>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {(['safe', 'watch', 'warning', 'critical'] as LakeStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor(s) }} />
              <span className="text-xs text-ink-600 capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location error */}
      {locationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-50 border border-warning-200 text-warning-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Map */}
      <div className="card overflow-hidden relative" style={{ height: '600px' }}>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-ink-200 shadow-lg p-3 max-w-[200px] pointer-events-none">
          <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5" /> Risk Indicators
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full border-2 border-danger-500 bg-danger-500/60" />
              <span className="text-ink-600">High bloom risk</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full border-2 border-warning-500 bg-warning-500/60" />
              <span className="text-ink-600">Moderate risk</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-accent-500 bg-accent-500/60" />
              <span className="text-ink-600">Low risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected lake detail */}
      {selected && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-bold">{selected.name}</h3>
              <div className="mt-1"><StateTag state={selected.state} district={selected.district} /></div>
              <div className="flex items-center gap-3 mt-3 text-sm">
                <span className="text-ink-500 capitalize">{selected.type}</span>
                {selected.area_sqkm ? <span className="text-ink-500">· {selected.area_sqkm} km²</span> : null}
                {selected.max_depth_m ? <span className="text-ink-500">· {selected.max_depth_m}m deep</span> : null}
              </div>
            </div>
            {(() => {
              const sb = statusBadge(selected.status);
              const Icon = sb.icon;
              return (
                <span className={sb.class}>
                  <Icon className="w-3 h-3" /> {sb.label}
                </span>
              );
            })()}
          </div>
          {selected.latest_prediction && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-ink-100">
              <Metric label="Bloom Probability" value={`${Math.round(selected.latest_prediction.bloom_probability * 100)}%`} color={statusColor(selected.status)} />
              <Metric label="Intensity" value={selected.latest_prediction.predicted_intensity} />
              <Metric label="Risk Level" value={selected.latest_prediction.risk_level} />
              <Metric label="Model" value={selected.latest_prediction.model_version} />
            </div>
          )}
        </div>
      )}

      {/* Info hint when no lake selected */}
      {!selected && (
        <div className="card p-4 flex items-center gap-3 text-sm text-ink-500">
          <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <span>Click any circle on the map to see detailed bloom prediction data for that water body.</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">{label}</p>
      <p className="text-sm font-bold capitalize mt-0.5" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}
