import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, MapPin, Activity, Droplets, Thermometer } from 'lucide-react';
import { fetchLakesWithDetails, fetchAllMonitoring } from '@/lib/dataAccess';
import type { LakeWithDetails, MonitoringData, LakeStatus } from '@/lib/supabase';
import { LoadingState, ErrorState, statusColor } from './ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

export function Analytics() {
  const [lakes, setLakes] = useState<LakeWithDetails[]>([]);
  const [readings, setReadings] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([fetchLakesWithDetails(), fetchAllMonitoring()]);
      setLakes(l);
      setReadings(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stateData = useMemo(() => {
    const byState = new Map<string, { state: string; total: number; critical: number; warning: number; watch: number; safe: number }>();
    lakes.forEach((l) => {
      const existing = byState.get(l.state) ?? { state: l.state, total: 0, critical: 0, warning: 0, watch: 0, safe: 0 };
      existing.total++;
      existing[l.status]++;
      byState.set(l.state, existing);
    });
    return Array.from(byState.values()).sort((a, b) => b.total - a.total).slice(0, 12);
  }, [lakes]);

  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    lakes.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
    return (['safe', 'watch', 'warning', 'critical'] as LakeStatus[]).map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: counts[s] ?? 0,
      color: statusColor(s),
    }));
  }, [lakes]);

  const scatterData = useMemo(() => {
    return lakes
      .filter((l) => l.latest_reading && l.latest_prediction)
      .map((l) => ({
        temp: l.latest_reading!.temperature_c ?? 0,
        chlorophyll: l.latest_reading!.chlorophyll_a_ugl ?? 0,
        nitrate: l.latest_reading!.nitrate_mgl ?? 0,
        name: l.name,
        status: l.status,
      }));
  }, [lakes]);

  const monthlyAvg = useMemo(() => {
    const byMonth = new Map<number, { chlorophyll: number; temp: number; do: number; count: number }>();
    readings.forEach((r) => {
      const m = new Date(r.recorded_at).getMonth();
      const existing = byMonth.get(m) ?? { chlorophyll: 0, temp: 0, do: 0, count: 0 };
      existing.chlorophyll += r.chlorophyll_a_ugl ?? 0;
      existing.temp += r.temperature_c ?? 0;
      existing.do += r.dissolved_oxygen_mgl ?? 0;
      existing.count++;
      byMonth.set(m, existing);
    });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, v]) => ({
        month: months[m],
        chlorophyll: v.count > 0 ? v.chlorophyll / v.count : 0,
        temp: v.count > 0 ? v.temp / v.count : 0,
        do: v.count > 0 ? v.do / v.count : 0,
      }));
  }, [readings]);

  const radarData = useMemo(() => {
    const latestReadings = new Map<string, MonitoringData>();
    readings.forEach((r) => {
      if (!latestReadings.has(r.lake_id)) latestReadings.set(r.lake_id, r);
    });
    const avg = (key: keyof MonitoringData) => {
      const vals = Array.from(latestReadings.values()).map((r) => r[key] as number).filter((v) => v != null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return [
      { metric: 'Temp', value: avg('temperature_c'), fullMark: 40 },
      { metric: 'pH', value: avg('ph'), fullMark: 11 },
      { metric: 'DO', value: avg('dissolved_oxygen_mgl'), fullMark: 14 },
      { metric: 'Chlor-a', value: avg('chlorophyll_a_ugl'), fullMark: 100 },
      { metric: 'Nitrate', value: avg('nitrate_mgl'), fullMark: 5 },
      { metric: 'Phosphate', value: avg('phosphate_mgl'), fullMark: 1 },
      { metric: 'Turbidity', value: avg('turbidity_ntu'), fullMark: 80 },
    ];
  }, [readings]);

  if (loading) return <LoadingState message="Analyzing data..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const avgBloomProb = lakes.length > 0
    ? lakes.reduce((sum, l) => sum + (l.latest_prediction?.bloom_probability ?? 0), 0) / lakes.length
    : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" /> Analytics & Insights
        </h2>
        <p className="text-sm text-ink-500">
          Spatial and temporal analysis of bloom risk across {lakes.length} Indian water bodies
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Avg Bloom Probability" value={`${(avgBloomProb * 100).toFixed(1)}%`} color="#ef4444" />
        <KPICard icon={TrendingUp} label="Peak Bloom Month" value={monthlyAvg.reduce((max, m) => m.chlorophyll > max.chlorophyll ? m : max, monthlyAvg[0])?.month ?? '—'} color="#f97316" />
        <KPICard icon={Droplets} label="Avg Chlorophyll-a" value={`${(radarData[3]?.value ?? 0).toFixed(1)} µg/L`} color="#06b6d4" />
        <KPICard icon={Thermometer} label="Avg Water Temp" value={`${(radarData[0]?.value ?? 0).toFixed(1)} °C`} color="#f59e0b" />
      </div>

      {/* State distribution + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2">
          <h3 className="section-title mb-1">Sites by State (Top 12)</h3>
          <p className="text-xs text-ink-500 mb-4">Distribution of monitoring sites and risk levels across Indian states</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="state" tick={{ fontSize: 9, fill: '#64748b' }} angle={-35} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RTooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="safe" stackId="a" fill="#10b981" name="Safe" />
                <Bar dataKey="watch" stackId="a" fill="#f59e0b" name="Watch" />
                <Bar dataKey="warning" stackId="a" fill="#f97316" name="Warning" />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Status Distribution</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1">
            {statusPieData.map((s) => (
              <div key={s.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-ink-600">{s.name}</span>
                </span>
                <span className="font-semibold text-ink-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trends + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="section-title mb-1">Monthly Chlorophyll-a Trend</h3>
          <p className="text-xs text-ink-500 mb-4">National average chlorophyll-a concentration by month</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAvg} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <RTooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="chlorophyll" fill="#ef4444" radius={[4, 4, 0, 0]} name="Chlorophyll-a (µg/L)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-1">Environmental Profile (National Average)</h3>
          <p className="text-xs text-ink-500 mb-4">Radar chart of average sensor readings across all sites</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: '#94a3b8' }} angle={90} />
                <Radar dataKey="value" stroke="#1c87f5" fill="#1c87f5" fillOpacity={0.3} strokeWidth={2} />
                <RTooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scatter: Temp vs Chlorophyll */}
      <div className="card p-6">
        <h3 className="section-title mb-1">Temperature vs Chlorophyll-a Correlation</h3>
        <p className="text-xs text-ink-500 mb-4">Each point is a water body — bubble size = nitrate level, color = status</p>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="temp" name="Temperature" unit="°C" tick={{ fontSize: 11, fill: '#64748b' }} domain={[5, 40]} />
              <YAxis type="number" dataKey="chlorophyll" name="Chlorophyll-a" unit=" µg/L" tick={{ fontSize: 11, fill: '#64748b' }} />
              <ZAxis type="number" dataKey="nitrate" range={[30, 400]} name="Nitrate" />
              <RTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { name: string; temp: number; chlorophyll: number; nitrate: number; status: string };
                  return (
                    <div className="bg-white border border-ink-200 rounded-lg p-2.5 text-xs shadow-md">
                      <p className="font-bold mb-1">{d.name}</p>
                      <p>Temp: {d.temp.toFixed(1)}°C</p>
                      <p>Chlorophyll-a: {d.chlorophyll.toFixed(1)} µg/L</p>
                      <p>Nitrate: {d.nitrate.toFixed(2)} mg/L</p>
                      <p className="capitalize">Status: {d.status}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="#1c87f5">
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={statusColor(entry.status as LakeStatus)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data source summary */}
      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <MapPin className="w-4.5 h-4.5 text-primary-600" /> Monitoring Coverage
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CoverageStat label="States Covered" value={new Set(lakes.map(l => l.state)).size.toString()} />
          <CoverageStat label="Water Bodies" value={lakes.length.toString()} />
          <CoverageStat label="Sensor Readings" value={readings.length.toLocaleString('en-IN')} />
          <CoverageStat label="Data Points" value={(readings.length * 8).toLocaleString('en-IN')} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-ink-500">{label}</span>
      </div>
      <p className="text-xl font-display font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function CoverageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-ink-50 border border-ink-100">
      <p className="text-2xl font-display font-bold text-primary-700">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}
