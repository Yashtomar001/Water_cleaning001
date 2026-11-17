import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type LakeStatus = 'safe' | 'watch' | 'warning' | 'critical';
export type LakeType = 'lake' | 'river' | 'reservoir' | 'wetland';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type BloomIntensity = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export interface Lake {
  id: string;
  name: string;
  type: LakeType;
  state: string;
  district: string;
  lat: number;
  lng: number;
  area_sqkm: number | null;
  max_depth_m: number | null;
  status: LakeStatus;
  last_bloom_date: string | null;
  created_at: string;
}

export interface MonitoringData {
  id: string;
  lake_id: string;
  recorded_at: string;
  temperature_c: number | null;
  ph: number | null;
  dissolved_oxygen_mgl: number | null;
  turbidity_ntu: number | null;
  chlorophyll_a_ugl: number | null;
  nitrate_mgl: number | null;
  phosphate_mgl: number | null;
  rainfall_mm: number | null;
  sunlight_hours: number | null;
}

export interface Prediction {
  id: string;
  lake_id: string;
  predicted_at: string;
  bloom_probability: number;
  predicted_intensity: BloomIntensity;
  risk_level: RiskLevel;
  contributing_factors: Record<string, unknown>;
  model_version: string;
}

export interface Alert {
  id: string;
  lake_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  is_active: boolean;
  acknowledged: boolean;
}

export interface LakeWithDetails extends Lake {
  latest_prediction?: Prediction;
  latest_reading?: MonitoringData;
  alert_count?: number;
}

export type VideoCategory = 'restoration' | 'pollution' | 'community' | 'technique' | 'policy';

export interface EducationalVideo {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  category: VideoCategory;
  duration_min: number;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
}
