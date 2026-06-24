export type Theme = "voxel" | "neonnoir" | "shinobi" | "fut" | "bloom" | "synth";
export type Language = "es" | "en";

export interface FitbitSessionRow {
  id: string;
  user_id: string;
  fitbit_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  theme: Theme;
  language: Language;
  updated_at: string;
}

export interface FitbitCacheRow {
  id: string;
  user_id: string;
  endpoint: string;
  date: string;
  payload: Record<string, unknown>;
  fetched_at: string;
}

export interface MetricsHistoryRow {
  id: string;
  user_id: string;
  date: string;
  steps: number | null;
  calories: number | null;
  distance: number | null;
  active_min: number | null;
  sleep_min: number | null;
  resting_hr: number | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen: string;
}

export interface Database {
  public: {
    Tables: {
      fitbit_sessions: {
        Row: FitbitSessionRow;
        Insert: Omit<FitbitSessionRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<FitbitSessionRow, "id" | "created_at" | "updated_at">>;
      };
      user_preferences: {
        Row: UserPreferencesRow;
        Insert: Omit<UserPreferencesRow, "updated_at">;
        Update: Partial<Omit<UserPreferencesRow, "updated_at">>;
      };
      fitbit_cache: {
        Row: FitbitCacheRow;
        Insert: Omit<FitbitCacheRow, "id" | "fetched_at">;
        Update: Partial<Omit<FitbitCacheRow, "id" | "fetched_at">>;
      };
      metrics_history: {
        Row: MetricsHistoryRow;
        Insert: Omit<MetricsHistoryRow, "id" | "created_at">;
        Update: Partial<Omit<MetricsHistoryRow, "id" | "created_at">>;
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Omit<PushSubscriptionRow, "id" | "created_at" | "last_seen">;
        Update: Partial<Omit<PushSubscriptionRow, "id" | "created_at">>;
      };
    };
  };
}
