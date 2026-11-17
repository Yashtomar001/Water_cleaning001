import { useEffect, useState } from 'react';
import { AlertTriangle, Siren, Eye, CheckCircle2, XCircle, Bell, BellOff } from 'lucide-react';
import { fetchActiveAlerts, acknowledgeAlert, dismissAlert } from '@/lib/dataAccess';
import type { Alert } from '@/lib/supabase';
import { LoadingState, ErrorState, formatDateTime } from './ui';
import type { ViewKey } from './Sidebar';

type AlertWithLake = Alert & { lake_name: string; lake_state: string };

export function EarlyWarnings({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [alerts, setAlerts] = useState<AlertWithLake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveAlerts();
      setAlerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
    } catch {
      // non-fatal
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // non-fatal
    }
  };

  if (loading) return <LoadingState message="Loading alerts..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const filtered = alerts.filter((a) => filter === 'all' || a.severity === filter);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;
  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-danger-600" /> Early Warning System
          </h2>
          <p className="text-sm text-ink-500">{alerts.length} active alerts · {unackCount} unacknowledged</p>
        </div>
        <button onClick={load} className="btn-ghost text-sm">Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={Siren} label="Critical" count={criticalCount} color="text-danger-600" bg="bg-danger-50" ring="ring-danger-200" />
        <SummaryCard icon={AlertTriangle} label="Warning" count={warningCount} color="text-orange-600" bg="bg-orange-50" ring="ring-orange-200" />
        <SummaryCard icon={Eye} label="Watch" count={infoCount} color="text-warning-600" bg="bg-warning-50" ring="ring-warning-200" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f
                ? 'bg-ink-900 text-white'
                : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            {f === 'all' ? 'All Alerts' : f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAck={() => handleAck(alert.id)}
            onDismiss={() => handleDismiss(alert.id)}
            onViewLake={() => onNavigate('lakes')}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <BellOff className="w-10 h-10 text-accent-400 mx-auto mb-3" />
          <p className="text-ink-600 font-medium">No active alerts</p>
          <p className="text-sm text-ink-400 mt-1">All monitored water bodies are within safe parameters.</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, count, color, bg, ring }: {
  icon: typeof Siren; label: string; count: number; color: string; bg: string; ring: string;
}) {
  return (
    <div className={`card p-4 flex items-center gap-3 ring-2 ${ring} ring-offset-0`}>
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5.5 h-5.5 ${color}`} size={22} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-ink-900">{count}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAck, onDismiss, onViewLake }: {
  alert: AlertWithLake;
  onAck: () => void;
  onDismiss: () => void;
  onViewLake: () => void;
}) {
  const config: Record<string, { color: string; bg: string; border: string; icon: typeof Siren; label: string }> = {
    critical: { color: '#ef4444', bg: 'bg-danger-50', border: 'border-danger-200', icon: Siren, label: 'Critical' },
    warning: { color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, label: 'Warning' },
    info: { color: '#f59e0b', bg: 'bg-warning-50', border: 'border-warning-200', icon: Eye, label: 'Watch' },
  };
  const cfg = config[alert.severity];
  const Icon = cfg.icon;

  return (
    <div className={`card p-4 border-l-4 ${cfg.border} ${alert.acknowledged ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: cfg.color }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
            <span className="text-xs text-ink-400">·</span>
            <button onClick={onViewLake} className="font-semibold text-sm text-ink-900 hover:text-primary-600 transition-colors">
              {alert.lake_name}
            </button>
            <span className="text-xs text-ink-500">{alert.lake_state}</span>
            {alert.acknowledged && (
              <span className="badge bg-accent-100 text-accent-700 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Acknowledged
              </span>
            )}
          </div>
          <p className="text-sm text-ink-600 mt-1">{alert.message}</p>
          <p className="text-xs text-ink-400 mt-1.5">{formatDateTime(alert.created_at)}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!alert.acknowledged && (
            <button
              onClick={onAck}
              className="btn-ghost text-xs py-1.5 px-3"
              title="Acknowledge alert"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Ack
            </button>
          )}
          <button
            onClick={onDismiss}
            className="btn-ghost text-xs py-1.5 px-2.5"
            title="Dismiss alert"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

