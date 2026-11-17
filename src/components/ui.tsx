import type { LakeStatus, RiskLevel, BloomIntensity } from '@/lib/supabase';
import { Droplets, Eye, AlertTriangle, Siren, MapPin } from 'lucide-react';

export function statusBadge(status: LakeStatus) {
  const map = {
    safe: { class: 'badge-safe', label: 'Safe', icon: Droplets },
    watch: { class: 'badge-watch', label: 'Watch', icon: Eye },
    warning: { class: 'badge-warning', label: 'Warning', icon: AlertTriangle },
    critical: { class: 'badge-critical', label: 'Critical', icon: Siren },
  };
  return map[status];
}

export function riskColor(risk: RiskLevel): string {
  const map = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return map[risk];
}

export function statusColor(status: LakeStatus): string {
  const map = {
    safe: '#10b981',
    watch: '#f59e0b',
    warning: '#f97316',
    critical: '#ef4444',
  };
  return map[status];
}

export function intensityLabel(intensity: BloomIntensity): string {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1);
}

export function probabilityColor(p: number): string {
  if (p >= 0.75) return '#ef4444';
  if (p >= 0.5) return '#f97316';
  if (p >= 0.25) return '#f59e0b';
  return '#10b981';
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function StateTag({ state, district }: { state: string; district?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-500">
      <MapPin className="w-3 h-3" />
      {district ? `${district}, ` : ''}{state}
    </span>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-ink-200 border-t-primary-500"
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingState({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size={32} />
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-danger-600" />
      </div>
      <p className="text-sm text-ink-600 text-center max-w-md">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost">Try Again</button>}
    </div>
  );
}

export function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - value);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-ink-600 mt-1">{label}</span>
    </div>
  );
}

export function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-800">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
