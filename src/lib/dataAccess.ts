import { supabase, type Lake, type MonitoringData, type Prediction, type Alert, type LakeWithDetails, type EducationalVideo, type VideoCategory } from './supabase';

export async function fetchLakesWithDetails(): Promise<LakeWithDetails[]> {
  const { data: lakes, error } = await supabase
    .from('lakes')
    .select('*')
    .order('name');
  if (error) throw error;

  const { data: predictions, error: predErr } = await supabase
    .from('predictions')
    .select('*')
    .order('predicted_at', { ascending: false });
  if (predErr) throw predErr;

  const { data: alerts, error: alertErr } = await supabase
    .from('alerts')
    .select('lake_id, is_active')
    .eq('is_active', true);
  if (alertErr) throw alertErr;

  const { data: readings, error: readErr } = await supabase
    .from('monitoring_data')
    .select('*')
    .order('recorded_at', { ascending: false });
  if (readErr) throw readErr;

  const predByLake = new Map<string, Prediction>();
  predictions?.forEach((p: Prediction) => {
    if (!predByLake.has(p.lake_id)) predByLake.set(p.lake_id, p);
  });

  const readingByLake = new Map<string, MonitoringData>();
  readings?.forEach((r: MonitoringData) => {
    if (!readingByLake.has(r.lake_id)) readingByLake.set(r.lake_id, r);
  });

  const alertCountByLake = new Map<string, number>();
  (alerts ?? []).forEach((a: { lake_id: string; is_active: boolean }) => {
    alertCountByLake.set(a.lake_id, (alertCountByLake.get(a.lake_id) ?? 0) + 1);
  });

  return (lakes as Lake[]).map((lake) => ({
    ...lake,
    latest_prediction: predByLake.get(lake.id),
    latest_reading: readingByLake.get(lake.id),
    alert_count: alertCountByLake.get(lake.id) ?? 0,
  }));
}

export async function fetchLakeById(id: string): Promise<Lake | null> {
  const { data, error } = await supabase.from('lakes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Lake | null;
}

export async function fetchLakeMonitoring(lakeId: string): Promise<MonitoringData[]> {
  const { data, error } = await supabase
    .from('monitoring_data')
    .select('*')
    .eq('lake_id', lakeId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MonitoringData[];
}

export async function fetchLakePredictions(lakeId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('lake_id', lakeId)
    .order('predicted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Prediction[];
}

export async function fetchActiveAlerts(): Promise<(Alert & { lake_name: string; lake_state: string })[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      lakes:lake_id (name, state)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    lake_id: a.lake_id as string,
    alert_type: a.alert_type as string,
    severity: a.severity as 'info' | 'warning' | 'critical',
    message: a.message as string,
    created_at: a.created_at as string,
    is_active: a.is_active as boolean,
    acknowledged: a.acknowledged as boolean,
    lake_name: (a.lakes as { name: string; state: string }).name,
    lake_state: (a.lakes as { name: string; state: string }).state,
  }));
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('alerts').update({ acknowledged: true }).eq('id', alertId);
  if (error) throw error;
}

export async function dismissAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('alerts').update({ is_active: false }).eq('id', alertId);
  if (error) throw error;
}

export async function fetchAllMonitoring(): Promise<MonitoringData[]> {
  const { data, error } = await supabase
    .from('monitoring_data')
    .select('*')
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MonitoringData[];
}

export async function fetchDashboardStats() {
  const { count: totalLakes } = await supabase.from('lakes').select('*', { count: 'exact', head: true });
  const { count: criticalCount } = await supabase.from('lakes').select('*', { count: 'exact', head: true }).eq('status', 'critical');
  const { count: warningCount } = await supabase.from('lakes').select('*', { count: 'exact', head: true }).eq('status', 'warning');
  const { count: watchCount } = await supabase.from('lakes').select('*', { count: 'exact', head: true }).eq('status', 'watch');
  const { count: activeAlerts } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: totalReadings } = await supabase.from('monitoring_data').select('*', { count: 'exact', head: true });

  return {
    totalLakes: totalLakes ?? 0,
    criticalCount: criticalCount ?? 0,
    warningCount: warningCount ?? 0,
    watchCount: watchCount ?? 0,
    activeAlerts: activeAlerts ?? 0,
    totalReadings: totalReadings ?? 0,
  };
}

export async function fetchVideos(): Promise<EducationalVideo[]> {
  const { data, error } = await supabase
    .from('educational_videos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EducationalVideo[];
}

export async function fetchWatchedVideoIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('video_progress')
    .select('video_id, watched')
    .eq('user_id', userId)
    .eq('watched', true);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { video_id: string }) => r.video_id));
}

export async function markVideoWatched(userId: string, videoId: string): Promise<void> {
  const { error } = await supabase
    .from('video_progress')
    .upsert({ user_id: userId, video_id: videoId, watched: true }, { onConflict: 'user_id,video_id' });
  if (error) throw error;
}
