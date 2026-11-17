import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase, type LakeWithDetails, type MonitoringData, type Prediction, type Alert } from './supabase';
import { fetchLakesWithDetails, fetchActiveAlerts } from './dataAccess';

interface LiveDataContextValue {
  lakes: LakeWithDetails[];
  alerts: (Alert & { lake_name: string; lake_state: string })[];
  liveMode: boolean;
  toggleLiveMode: () => void;
  lastUpdate: Date | null;
  isPolling: boolean;
  liveReadings: MonitoringData[];
  refresh: () => Promise<void>;
}

const LiveDataContext = createContext<LiveDataContextValue | undefined>(undefined);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [lakes, setLakes] = useState<LakeWithDetails[]>([]);
  const [alerts, setAlerts] = useState<(Alert & { lake_name: string; lake_state: string })[]>([]);
  const [liveMode, setLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [liveReadings, setLiveReadings] = useState<MonitoringData[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [lakeData, alertData] = await Promise.all([
        fetchLakesWithDetails(),
        fetchActiveAlerts(),
      ]);
      setLakes(lakeData);
      setAlerts(alertData);
      setLastUpdate(new Date());
    } catch {
      // non-fatal
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('live-monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'monitoring_data' }, (payload) => {
        const newReading = payload.new as MonitoringData;
        setLiveReadings((prev) => [newReading, ...prev].slice(0, 50));
        // Update the corresponding lake's latest_reading
        setLakes((prev) =>
          prev.map((l) =>
            l.id === newReading.lake_id
              ? { ...l, latest_reading: newReading }
              : l
          )
        );
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, (payload) => {
        const newPred = payload.new as Prediction;
        setLakes((prev) =>
          prev.map((l) =>
            l.id === newPred.lake_id
              ? { ...l, latest_prediction: newPred }
              : l
          )
        );
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, async () => {
        // Refresh alerts when a new one is inserted
        try {
          const alertData = await fetchActiveAlerts();
          setAlerts(alertData);
        } catch {
          // non-fatal
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, async () => {
        try {
          const alertData = await fetchActiveAlerts();
          setAlerts(alertData);
        } catch {
          // non-fatal
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lakes' }, (payload) => {
        const updated = payload.new as LakeWithDetails;
        setLakes((prev) =>
          prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Live feed polling — calls the edge function to generate new sensor data
  const triggerFeed = useCallback(async () => {
    setIsPolling(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/live-sensor-feed`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setLastUpdate(new Date());
      }
    } catch {
      // non-fatal — network issues don't crash the app
    } finally {
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    if (liveMode) {
      // Trigger immediately, then every 15 seconds
      triggerFeed();
      pollRef.current = setInterval(triggerFeed, 15000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [liveMode, triggerFeed]);

  const toggleLiveMode = useCallback(() => {
    setLiveMode((prev) => !prev);
  }, []);

  return (
    <LiveDataContext.Provider
      value={{
        lakes,
        alerts,
        liveMode,
        toggleLiveMode,
        lastUpdate,
        isPolling,
        liveReadings,
        refresh,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error('useLiveData must be used within LiveDataProvider');
  return ctx;
}
