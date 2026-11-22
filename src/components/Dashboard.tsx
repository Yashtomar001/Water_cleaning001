import { useEffect, useState, useMemo } from 'react';
import { Droplets, Eye, AlertTriangle, Siren, Activity, Waves, Radio, ShieldAlert } from 'lucide-react';
import { fetchDashboardStats } from '@/lib/dataAccess';
import { useLiveData } from '@/lib/liveData';
import { LiveStatusBar } from './LiveStatusBar';
import { LoadingState, ErrorState, statusColor, statusBadge, formatDate, probabilityColor } from './ui';
import type { ViewKey } from './Sidebar';

interface Stats {
  totalLakes: number;
  criticalCount: number;
  warningCount: number;
  watchCount: number;
  activeAlerts: number;
  totalReadings: number;
}

export function Dashboard({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const { lakes, alerts, lastUpdate, refresh } = useLiveData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const s = await fetchDashboardStats();
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  // Refresh stats when live data updates
  useEffect(() => {
    if (lastUpdate) loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdate]);

  const topRisk = useMemo(() => {
    return lakes
      .filter((l) => l.latest_prediction)
      .sort((a, b) => (b.latest_prediction!.bloom_probability - a.latest_prediction!.bloom_probability))
      .slice(0, 8);
  }, [lakes]);

  if (loading) return <LoadingState message="Loading monitoring data..." />;
  if (error || !stats) return <ErrorState message={error ?? 'Unknown error'} onRetry={loadStats} />;

  const safeCount = stats.totalLakes - stats.criticalCount - stats.warningCount - stats.watchCount;
  const activeAlertCount = alerts.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live status bar */}
      <LiveStatusBar />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-primary-900 to-teal-900 text-white p-6 md:p-8">
        <div className="absolute inset-0 opacity-10">
          <Waves className="absolute -right-8 -top-8 w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-primary-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">National Monitoring Network</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-accent-300 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
              </span>
              LIVE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Phytoplankton Bloom Prediction System</h1>
          <p className="text-ink-300 text-sm md:text-base max-w-2xl">
            Machine learning-powered early warning for harmful algal blooms across India's freshwater bodies.
            Real-time sensor data, satellite imagery analysis, and spatial risk mapping for aquatic ecosystem management.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => onNavigate('feed')} className="btn bg-primary-500 text-white hover:bg-primary-400">
              <Radio className="w-4 h-4" /> View Sensor Feed
            </button>
            <button onClick={() => onNavigate('alerts')} className="btn bg-white/10 backdrop-blur text-white hover:bg-white/20 border border-white/20">
              <AlertTriangle className="w-4 h-4" /> {activeAlertCount} Active Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Waves} label="Total Sites" value={stats.totalLakes} color="text-primary-600" bg="bg-primary-50" />
        <StatCard icon={Droplets} label="Safe" value={safeCount} color="text-accent-600" bg="bg-accent-50" />
        <StatCard icon={Eye} label="Watch" value={stats.watchCount} color="text-warning-600" bg="bg-warning-50" />
        <StatCard icon={AlertTriangle} label="Warning" value={stats.warningCount} color="text-orange-600" bg="bg-orange-50" />
        <StatCard icon={Siren} label="Critical" value={stats.criticalCount} color="text-danger-600" bg="bg-danger-50" />
        <StatCard icon={Activity} label="Data Points" value={stats.totalReadings.toLocaleString('en-IN')} color="text-teal-600" bg="bg-teal-50" />
      </div>

      {/* Distribution + Top Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status distribution */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="section-title mb-4">Status Distribution</h3>
          <div className="space-y-3">
            <DistBar label="Safe" count={safeCount} total={stats.totalLakes} color="#10b981" />
            <DistBar label="Watch" count={stats.watchCount} total={stats.totalLakes} color="#f59e0b" />
            <DistBar label="Warning" count={stats.warningCount} total={stats.totalLakes} color="#f97316" />
            <DistBar label="Critical" count={stats.criticalCount} total={stats.totalLakes} color="#ef4444" />
          </div>
          <div className="mt-5 pt-4 border-t border-ink-100">
            <p className="text-xs text-ink-500">
              {Math.round((stats.criticalCount + stats.warningCount) / stats.totalLakes * 100)}% of monitored sites
              currently require intervention.
            </p>
          </div>
        </div>

        {/* Top risk lakes */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Highest Bloom Risk</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-accent-600 font-semibold flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
                </span>
                Live ranking
              </span>
              <button onClick={() => onNavigate('lakes')} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                View All →
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {topRisk.map((lake, i) => {
              const pred = lake.latest_prediction!;
              const sb = statusBadge(lake.status);
              const StatusIcon = sb.icon;
              return (
                <div
                  key={lake.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:border-ink-200 hover:bg-ink-50 transition-all cursor-pointer"
                  onClick={() => onNavigate('lakes')}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ink-100 text-xs font-bold text-ink-500">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink-900 truncate">{lake.name}</p>
                    <p className="text-xs text-ink-500">{lake.state} · {lake.type}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-lg font-display font-bold" style={{ color: probabilityColor(pred.bloom_probability) }}>
                      {Math.round(pred.bloom_probability * 100)}%
                    </div>
                    <div className="text-[10px] text-ink-400">bloom prob.</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0`} style={{ backgroundColor: statusColor(lake.status) }} />
                  <span className={`${sb.class} hidden md:inline-flex`}>
                    <StatusIcon className="w-3 h-3" /> {sb.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent blooms */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Recent Bloom Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topRisk.filter(l => l.last_bloom_date).slice(0, 6).map(lake => (
            <div key={lake.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${statusColor(lake.status)}20` }}>
                <AlertTriangle className="w-5 h-5" style={{ color: statusColor(lake.status) }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{lake.name}</p>
                <p className="text-xs text-ink-500">{lake.state}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-ink-700">{formatDate(lake.last_bloom_date)}</p>
                <p className="text-[10px] text-ink-400">last bloom</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Activity; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="font-semibold text-ink-900">{count}</span>
      </div>
      <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-800 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
