import { useEffect, useState, useMemo } from 'react';
import { Search, MapPin, ChevronLeft, ArrowUpDown } from 'lucide-react';
import { fetchLakesWithDetails, fetchLakeMonitoring, fetchLakePredictions } from '@/lib/dataAccess';
import type { LakeWithDetails, MonitoringData, Prediction, LakeStatus } from '@/lib/supabase';
import { LoadingState, ErrorState, statusBadge, statusColor, StateTag, formatDate, MiniBar, Gauge, probabilityColor } from './ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';

type SortKey = 'name' | 'risk' | 'status' | 'area';

export function LakeExplorer() {
  const [lakes, setLakes] = useState<LakeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [filterStatus, setFilterStatus] = useState<LakeStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [selectedLake, setSelectedLake] = useState<LakeWithDetails | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLakesWithDetails();
      setLakes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lakes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const states = useMemo(() => {
    return Array.from(new Set(lakes.map((l) => l.state))).sort();
  }, [lakes]);

  const filtered = useMemo(() => {
    let result = lakes.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.state.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterState !== 'all' && l.state !== filterState) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    });

    const statusOrder: Record<string, number> = { critical: 0, warning: 1, watch: 2, safe: 3 };
    result.sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name);
        case 'area': return (b.area_sqkm ?? 0) - (a.area_sqkm ?? 0);
        case 'status': return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        case 'risk':
        default:
          return (b.latest_prediction?.bloom_probability ?? 0) - (a.latest_prediction?.bloom_probability ?? 0);
      }
    });
    return result;
  }, [lakes, search, filterState, filterStatus, sortKey]);

  if (loading) return <LoadingState message="Loading lake data..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  if (selectedLake) {
    return <LakeDetail lake={selectedLake} onBack={() => setSelectedLake(null)} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold">Lake Explorer</h2>
        <p className="text-sm text-ink-500">{filtered.length} of {lakes.length} water bodies across India</p>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lake name or state..."
            className="input pl-9"
          />
        </div>
        <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="input w-auto py-2 text-sm">
          <option value="all">All States</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LakeStatus | 'all')} className="input w-auto py-2 text-sm">
          <option value="all">All Status</option>
          <option value="safe">Safe</option>
          <option value="watch">Watch</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <div className="flex items-center gap-1.5 text-sm">
          <ArrowUpDown className="w-3.5 h-3.5 text-ink-400" />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="input w-auto py-2 text-sm">
            <option value="risk">Sort: Risk</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
            <option value="area">Sort: Area</option>
          </select>
        </div>
      </div>

      {/* Lake grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lake) => {
          const sb = statusBadge(lake.status);
          const StatusIcon = sb.icon;
          const pred = lake.latest_prediction;
          return (
            <button
              key={lake.id}
              onClick={() => setSelectedLake(lake)}
              className="card card-hover p-4 text-left group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-sm text-ink-900 group-hover:text-primary-700 transition-colors truncate">
                    {lake.name}
                  </h3>
                  <div className="mt-0.5"><StateTag state={lake.state} district={lake.district} /></div>
                </div>
                <span className={sb.class + ' flex-shrink-0'}>
                  <StatusIcon className="w-3 h-3" /> {sb.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-500 mb-3">
                <span className="capitalize">{lake.type}</span>
                {lake.area_sqkm ? <span>· {lake.area_sqkm} km²</span> : null}
              </div>

              {pred && (
                <div className="space-y-1.5 pt-2 border-t border-ink-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-500">Bloom Probability</span>
                    <span className="font-bold" style={{ color: probabilityColor(pred.bloom_probability) }}>
                      {Math.round(pred.bloom_probability * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pred.bloom_probability * 100}%`, backgroundColor: probabilityColor(pred.bloom_probability) }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-400 mt-1">
                    <span>Intensity: <span className="font-semibold capitalize">{pred.predicted_intensity}</span></span>
                    <span>Risk: <span className="font-semibold capitalize">{pred.risk_level}</span></span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <MapPin className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">No lakes match your filters.</p>
        </div>
      )}
    </div>
  );
}

function LakeDetail({ lake, onBack }: { lake: LakeWithDetails; onBack: () => void }) {
  const [readings, setReadings] = useState<MonitoringData[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [r, p] = await Promise.all([fetchLakeMonitoring(lake.id), fetchLakePredictions(lake.id)]);
        setReadings(r);
        setPredictions(p);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lake.id]);

  const sb = statusBadge(lake.status);
  const StatusIcon = sb.icon;
  const latestReading = readings[readings.length - 1];
  const pred = lake.latest_prediction;

  const chartData = readings.map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString('en-IN', { month: 'short' }),
    chlorophyll: r.chlorophyll_a_ugl ?? 0,
    temperature: r.temperature_c ?? 0,
    DO: r.dissolved_oxygen_mgl ?? 0,
    turbidity: r.turbidity_ntu ?? 0,
    nitrate: r.nitrate_mgl ?? 0,
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Lake Explorer
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-display font-bold">{lake.name}</h2>
            <div className="mt-2"><StateTag state={lake.state} district={lake.district} /></div>
            <div className="flex items-center gap-3 mt-3 text-sm text-ink-500">
              <span className="capitalize">{lake.type}</span>
              {lake.area_sqkm ? <span>· {lake.area_sqkm} km²</span> : null}
              {lake.max_depth_m ? <span>· {lake.max_depth_m}m max depth</span> : null}
              {lake.last_bloom_date && <span>· Last bloom: {formatDate(lake.last_bloom_date)}</span>}
            </div>
          </div>
          <span className={sb.class + ' text-sm px-3 py-1.5'}>
            <StatusIcon className="w-4 h-4" /> {sb.label}
          </span>
        </div>
      </div>

      {/* Prediction + current readings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {pred && (
          <div className="card p-6 flex flex-col items-center justify-center">
            <h3 className="section-title mb-4 self-start">Bloom Prediction</h3>
            <Gauge
              value={pred.bloom_probability}
              label="Bloom Probability"
              color={probabilityColor(pred.bloom_probability)}
            />
            <div className="grid grid-cols-2 gap-3 mt-4 w-full text-center">
              <div className="p-2 rounded-lg bg-ink-50">
                <p className="text-[10px] uppercase tracking-wide text-ink-400">Intensity</p>
                <p className="font-bold capitalize text-sm">{pred.predicted_intensity}</p>
              </div>
              <div className="p-2 rounded-lg bg-ink-50">
                <p className="text-[10px] uppercase tracking-wide text-ink-400">Risk Level</p>
                <p className="font-bold capitalize text-sm">{pred.risk_level}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6 lg:col-span-2">
          <h3 className="section-title mb-4">Latest Environmental Readings</h3>
          {latestReading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox label="Water Temp" value={`${latestReading.temperature_c?.toFixed(1) ?? '—'} °C`} color="#f97316" />
              <MetricBox label="pH Level" value={latestReading.ph?.toFixed(2) ?? '—'} color="#06b6d4" />
              <MetricBox label="Dissolved O₂" value={`${latestReading.dissolved_oxygen_mgl?.toFixed(2) ?? '—'} mg/L`} color="#10b981" />
              <MetricBox label="Turbidity" value={`${latestReading.turbidity_ntu?.toFixed(1) ?? '—'} NTU`} color="#8b5cf6" />
              <MetricBox label="Chlorophyll-a" value={`${latestReading.chlorophyll_a_ugl?.toFixed(1) ?? '—'} µg/L`} color="#ef4444" />
              <MetricBox label="Nitrate" value={`${latestReading.nitrate_mgl?.toFixed(3) ?? '—'} mg/L`} color="#f59e0b" />
              <MetricBox label="Phosphate" value={`${latestReading.phosphate_mgl?.toFixed(3) ?? '—'} mg/L`} color="#ec4899" />
              <MetricBox label="Sunlight" value={`${latestReading.sunlight_hours?.toFixed(1) ?? '—'} hrs`} color="#eab308" />
            </div>
          ) : (
            <p className="text-sm text-ink-500">No readings available.</p>
          )}
        </div>
      </div>

      {/* Time series chart */}
      {loading ? (
        <div className="card p-6"><LoadingState message="Loading time series..." /></div>
      ) : chartData.length > 0 ? (
        <div className="card p-6">
          <h3 className="section-title mb-1">12-Month Environmental Trends</h3>
          <p className="text-xs text-ink-500 mb-4">Monthly monitoring data showing key bloom indicators over time</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RTooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="chlorophyll" stroke="#ef4444" strokeWidth={2.5} name="Chlorophyll-a (µg/L)" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} name="Temp (°C)" dot={false} />
                <Line type="monotone" dataKey="DO" stroke="#10b981" strokeWidth={2} name="DO (mg/L)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Chlorophyll-a area chart — bloom indicator */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h3 className="section-title mb-1">Chlorophyll-a Trend (Bloom Indicator)</h3>
          <p className="text-xs text-ink-500 mb-4">Values above 40 µg/L indicate bloom conditions</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="chlorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RTooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="chlorophyll" stroke="#ef4444" strokeWidth={2.5} fill="url(#chlorGradient)" name="Chlorophyll-a" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Factor breakdown */}
      {pred && pred.contributing_factors && (
        <div className="card p-6">
          <h3 className="section-title mb-4">Contributing Factors Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {(() => {
              const factors = pred.contributing_factors as Record<string, number>;
              const weights = (pred.contributing_factors as Record<string, Record<string, number>>)?.weights ?? {};
              const entries: { name: string; value: number; weight: number; max: number; color: string }[] = [
                { name: 'Chlorophyll-a (µg/L)', value: factors.chlorophyll_a ?? 0, weight: weights.chlorophyll_a ?? 0.35, max: 100, color: '#ef4444' },
                { name: 'Nitrate (mg/L)', value: factors.nitrate ?? 0, weight: weights.nitrate ?? 0.15, max: 5, color: '#f59e0b' },
                { name: 'Phosphate (mg/L)', value: factors.phosphate ?? 0, weight: weights.phosphate ?? 0.15, max: 0.8, color: '#ec4899' },
                { name: 'Temperature (°C)', value: factors.temperature ?? 0, weight: weights.temperature ?? 0.12, max: 40, color: '#f97316' },
                { name: 'Dissolved O₂ (mg/L)', value: factors.dissolved_oxygen ?? 0, weight: weights.dissolved_oxygen ?? 0.10, max: 12, color: '#10b981' },
                { name: 'pH', value: factors.ph ?? 0, weight: weights.ph ?? 0.08, max: 10, color: '#06b6d4' },
                { name: 'Turbidity (NTU)', value: factors.turbidity ?? 0, weight: weights.turbidity ?? 0.05, max: 50, color: '#8b5cf6' },
              ];
              return entries.map((e) => (
                <MiniBar key={e.name} label={e.name} value={e.value} max={e.max} color={e.color} />
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl border border-ink-100">
      <div className="w-2 h-2 rounded-full mb-1.5" style={{ backgroundColor: color }} />
      <p className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">{label}</p>
      <p className="text-base font-bold text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
