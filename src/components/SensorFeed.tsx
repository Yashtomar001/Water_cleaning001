import { useState, useMemo, useEffect, useRef } from 'react';
import { Radio, Activity, Thermometer, Beaker, Waves, Droplets, Eye, Gauge as GaugeIcon, Filter, Zap } from 'lucide-react';
import { useLiveData } from '@/lib/liveData';
import { fetchAllMonitoring } from '@/lib/dataAccess';
import type { MonitoringData, LakeWithDetails } from '@/lib/supabase';
import { LoadingState, ErrorState, statusColor, probabilityColor } from './ui';

type FeedRow = MonitoringData & { lake_name: string; lake_state: string; status: string; bloom_probability: number };

const PARAM_META = [
  { key: 'temperature_c', label: 'Temperature', unit: '°C', icon: Thermometer, color: '#f59e0b', max: 40 },
  { key: 'ph', label: 'pH', unit: '', icon: Beaker, color: '#8b5cf6', max: 14 },
  { key: 'dissolved_oxygen_mgl', label: 'Dissolved O₂', unit: ' mg/L', icon: Droplets, color: '#06b6d4', max: 14 },
  { key: 'chlorophyll_a_ugl', label: 'Chlorophyll-a', unit: ' µg/L', icon: Activity, color: '#10b981', max: 100 },
  { key: 'nitrate_mgl', label: 'Nitrate', unit: ' mg/L', icon: Waves, color: '#3b82f6', max: 5 },
  { key: 'phosphate_mgl', label: 'Phosphate', unit: ' mg/L', icon: Beaker, color: '#ec4899', max: 1 },
  { key: 'turbidity_ntu', label: 'Turbidity', unit: ' NTU', icon: Eye, color: '#f97316', max: 80 },
  { key: 'rainfall_mm', label: 'Rainfall', unit: ' mm', icon: Droplets, color: '#0ea5e9', max: 50 },
] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function SensorFeed() {
  const { lakes, liveReadings, liveMode, lastUpdate } = useLiveData();
  const [historical, setHistorical] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLake, setFilterLake] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'stream' | 'grid'>('stream');
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllMonitoring()
      .then((data) => {
        setHistorical(data.slice(-200));
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load sensor data');
        setLoading(false);
      });
  }, []);

  const lakeMap = useMemo(() => {
    const m = new Map<string, LakeWithDetails>();
    lakes.forEach((l) => m.set(l.id, l));
    return m;
  }, [lakes]);

  const allReadings = useMemo(() => {
    const seen = new Set<string>();
    const combined: MonitoringData[] = [...liveReadings];
    historical.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        combined.push(r);
      }
    });
    liveReadings.forEach((r) => seen.add(r.id));
    return combined.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }, [liveReadings, historical]);

  const feedRows: FeedRow[] = useMemo(() => {
    return allReadings
      .map((r) => {
        const lake = lakeMap.get(r.lake_id);
        return {
          ...r,
          lake_name: lake?.name ?? 'Unknown Lake',
          lake_state: lake?.state ?? '',
          status: lake?.status ?? 'safe',
          bloom_probability: lake?.latest_prediction?.bloom_probability ?? 0,
        };
      })
      .filter((r) => filterLake === 'all' || r.lake_id === filterLake)
      .slice(0, viewMode === 'stream' ? 60 : 12);
  }, [allReadings, lakeMap, filterLake, viewMode]);

  const latestPerLake = useMemo(() => {
    const seen = new Set<string>();
    return allReadings
      .filter((r) => {
        if (seen.has(r.lake_id)) return false;
        seen.add(r.lake_id);
        return true;
      })
      .slice(0, 20);
  }, [allReadings]);

  const stats = useMemo(() => {
    if (latestPerLake.length === 0) return null;
    const avg = (key: keyof MonitoringData) => {
      const vals = latestPerLake.map((r) => r[key] as number).filter((v) => v != null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return {
      avgTemp: avg('temperature_c'),
      avgPH: avg('ph'),
      avgDO: avg('dissolved_oxygen_mgl'),
      avgChl: avg('chlorophyll_a_ugl'),
      avgTurb: avg('turbidity_ntu'),
      avgNitrate: avg('nitrate_mgl'),
    };
  }, [latestPerLake]);

  if (loading) return <LoadingState message="Loading sensor feed..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary-600" /> Live Sensor Feed
          </h2>
          <p className="text-sm text-ink-500">Real-time water quality readings from monitoring stations across India</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-ink-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('stream')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'stream' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              Stream
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Live indicator strip */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-ink-900 text-white text-sm">
        <span className={`flex items-center gap-1.5 font-semibold ${liveMode ? 'text-accent-300' : 'text-ink-400'}`}>
          <span className="relative flex h-2.5 w-2.5">
            {liveMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveMode ? 'bg-accent-400' : 'bg-ink-500'}`} />
          </span>
          {liveMode ? 'LIVE' : 'PAUSED'}
        </span>
        <span className="text-ink-400">·</span>
        <span className="text-ink-300 text-xs">
          {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString('en-IN')}` : 'Awaiting data...'}
        </span>
        <span className="ml-auto text-xs text-ink-400 flex items-center gap-1">
          <Zap className="w-3 h-3" /> {allReadings.length} readings
        </span>
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatChip icon={Thermometer} label="Avg Temp" value={`${stats.avgTemp.toFixed(1)}°C`} color="#f59e0b" />
          <StatChip icon={Beaker} label="Avg pH" value={stats.avgPH.toFixed(2)} color="#8b5cf6" />
          <StatChip icon={Droplets} label="Avg DO" value={`${stats.avgDO.toFixed(1)} mg/L`} color="#06b6d4" />
          <StatChip icon={Activity} label="Avg Chl-a" value={`${stats.avgChl.toFixed(1)} µg/L`} color="#10b981" />
          <StatChip icon={Eye} label="Avg Turb" value={`${stats.avgTurb.toFixed(1)} NTU`} color="#f97316" />
          <StatChip icon={Waves} label="Avg NO₃" value={`${stats.avgNitrate.toFixed(2)} mg/L`} color="#3b82f6" />
        </div>
      )}

      {/* Lake filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-ink-400" />
        <button
          onClick={() => setFilterLake('all')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${filterLake === 'all' ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
        >
          All Lakes
        </button>
        {lakes.slice(0, 10).map((l) => (
          <button
            key={l.id}
            onClick={() => setFilterLake(l.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${filterLake === l.id ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Feed */}
      {feedRows.length === 0 ? (
        <div className="card p-12 text-center">
          <Radio className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <p className="text-sm text-ink-500">No sensor readings yet. {liveMode ? 'Waiting for live data...' : 'Enable live mode to receive data.'}</p>
        </div>
      ) : viewMode === 'stream' ? (
        <div className="space-y-2">
          {feedRows.map((row, idx) => (
            <StreamRow key={row.id} row={row} isNew={idx === 0 && liveMode} />
          ))}
          <div ref={streamEndRef} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feedRows.map((row) => (
            <GridCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamRow({ row, isNew }: { row: FeedRow; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sColor = statusColor(row.status as 'safe' | 'watch' | 'warning' | 'critical');
  const probColor = probabilityColor(row.bloom_probability);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 cursor-pointer ${
        isNew ? 'border-primary-300 bg-primary-50/50 animate-fade-in' : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50'
      }`}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-ink-900 truncate">{row.lake_name}</p>
            {isNew && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">New</span>
            )}
          </div>
          <p className="text-xs text-ink-500 truncate">
            {row.lake_state && `${row.lake_state} · `}Updated {timeAgo(row.recorded_at)}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <MiniMetric icon={Thermometer} value={row.temperature_c} unit="°C" color="#f59e0b" />
          <MiniMetric icon={Activity} value={row.chlorophyll_a_ugl} unit=" µg/L" color="#10b981" />
          <MiniMetric icon={Droplets} value={row.dissolved_oxygen_mgl} unit="" color="#06b6d4" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {row.bloom_probability > 0 && (
            <div className="text-right">
              <span className="text-xs font-bold" style={{ color: probColor }}>
                {Math.round(row.bloom_probability * 100)}%
              </span>
              <p className="text-[9px] text-ink-400">bloom</p>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-ink-100 grid grid-cols-2 md:grid-cols-4 gap-3">
          {PARAM_META.map((p) => {
            const val = row[p.key as keyof MonitoringData] as number | null;
            const Icon = p.icon;
            return (
              <div key={p.key} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50">
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: p.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-500 truncate">{p.label}</p>
                  <p className="text-sm font-semibold text-ink-800">
                    {val != null ? `${val.toFixed(2)}${p.unit}` : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GridCard({ row }: { row: FeedRow }) {
  const sColor = statusColor(row.status as 'safe' | 'watch' | 'warning' | 'critical');
  const probColor = probabilityColor(row.bloom_probability);

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sColor }} />
          <div>
            <p className="font-semibold text-sm text-ink-900">{row.lake_name}</p>
            <p className="text-xs text-ink-500">{row.lake_state} · {timeAgo(row.recorded_at)}</p>
          </div>
        </div>
        {row.bloom_probability > 0 && (
          <div className="text-right">
            <span className="text-sm font-bold" style={{ color: probColor }}>
              {Math.round(row.bloom_probability * 100)}%
            </span>
            <p className="text-[9px] text-ink-400">bloom risk</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {PARAM_META.map((p) => {
          const val = row[p.key as keyof MonitoringData] as number | null;
          const Icon = p.icon;
          const pct = val != null ? Math.min(100, (val / p.max) * 100) : 0;
          return (
            <div key={p.key} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: p.color }} />
                <span className="text-[10px] text-ink-500 truncate">{p.label}</span>
              </div>
              <p className="text-sm font-semibold text-ink-800">
                {val != null ? `${val.toFixed(2)}${p.unit}` : '—'}
              </p>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniMetric({ icon: Icon, value, unit, color }: { icon: typeof Activity; value: number | null; unit: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-xs font-semibold text-ink-700">
        {value != null ? `${value.toFixed(1)}${unit}` : '—'}
      </span>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string; color: string }) {
  return (
    <div className="card p-3 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-display font-bold text-ink-900 truncate">{value}</p>
        <p className="text-[10px] text-ink-500 truncate">{label}</p>
      </div>
    </div>
  );
}
