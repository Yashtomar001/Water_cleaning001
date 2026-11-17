import { Radio, RefreshCw, Pause, Play, Clock } from 'lucide-react';
import { useLiveData } from '@/lib/liveData';

export function LiveStatusBar() {
  const { liveMode, toggleLiveMode, lastUpdate, isPolling } = useLiveData();

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={toggleLiveMode}
        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
          liveMode
            ? 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm'
            : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
        }`}
      >
        {liveMode ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <Radio className="w-4 h-4" /> Live
          </>
        ) : (
          <>
            <Play className="w-4 h-4" /> Paused
          </>
        )}
      </button>

      {liveMode && (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-primary-500' : ''}`} />
          <span>
            {isPolling ? 'Feeding sensor data...' : 'Auto-updating every 15s'}
          </span>
        </div>
      )}

      {lastUpdate && (
        <div className="flex items-center gap-1.5 text-xs text-ink-400 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Last update: {timeStr}</span>
        </div>
      )}

      {!liveMode && (
        <button
          onClick={toggleLiveMode}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <Pause className="w-3.5 h-3.5" /> Resume live feed
        </button>
      )}
    </div>
  );
}
