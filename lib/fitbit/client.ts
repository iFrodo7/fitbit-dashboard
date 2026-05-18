import { createServiceClient } from "@/lib/supabase/server";
import { getValidToken } from "./auth";
import type { FitbitActivity, FitbitSleep, FitbitHeartRate, FitbitProfile } from "./types";

const FITBIT_API = "https://api.fitbit.com/1/user/-";
const CACHE_TTL_MINUTES = 15;

async function fetchFitbit<T>(
  userId: string,
  endpoint: string
): Promise<T> {
  const token = await getValidToken(userId);
  const res = await fetch(`${FITBIT_API}/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    throw new Error(`Fitbit API error ${res.status} on ${endpoint}`);
  }
  return res.json();
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isCacheStale(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MINUTES * 60 * 1000;
}

/** Wrapper con caché en Supabase */
export async function getCached<T>(
  userId: string,
  endpoint: string,
  date = todayStr()
): Promise<T> {
  const db = createServiceClient();

  const { data: cached } = await db
    .from("fitbit_cache")
    .select("payload, fetched_at")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .eq("date", date)
    .single();

  if (cached && !isCacheStale(cached.fetched_at)) {
    return cached.payload as T;
  }

  const payload = await fetchFitbit<T>(userId, `${endpoint}/date/${date}/1d.json`
    .replace("activities-steps", "activities/steps")
    .replace("sleep-", "sleep/date/")
    || `${endpoint}`
  );

  await db.from("fitbit_cache").upsert({
    user_id: userId,
    endpoint,
    date,
    payload: payload as Record<string, unknown>,
    fetched_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint,date" });

  return payload;
}

// ─── Endpoints tipados ────────────────────────────────────────────────────────

export async function getActivity(userId: string, date = todayStr()): Promise<FitbitActivity> {
  return fetchFitbit<FitbitActivity>(userId, `activities/date/${date}.json`);
}

export async function getSleep(userId: string, date = todayStr()): Promise<FitbitSleep> {
  return fetchFitbit<FitbitSleep>(userId, `sleep/date/${date}.json`);
}

export async function getHeartRate(userId: string, date = todayStr()): Promise<FitbitHeartRate> {
  return fetchFitbit<FitbitHeartRate>(userId, `activities/heart/date/${date}/1d.json`);
}

export async function getProfile(userId: string): Promise<FitbitProfile> {
  return fetchFitbit<FitbitProfile>(userId, "profile.json");
}

/** Persiste métricas del día en metrics_history */
export async function persistDailyMetrics(userId: string, date = todayStr()) {
  const db = createServiceClient();
  const [activity, sleep, heart] = await Promise.allSettled([
    getActivity(userId, date),
    getSleep(userId, date),
    getHeartRate(userId, date),
  ]);

  const a = activity.status === "fulfilled" ? activity.value.summary : null;
  const s = sleep.status === "fulfilled" ? sleep.value.summary : null;
  const h = heart.status === "fulfilled"
    ? heart.value["activities-heart"]?.[0]?.value?.restingHeartRate
    : null;

  await db.from("metrics_history").upsert({
    user_id: userId,
    date,
    steps: a?.steps ?? null,
    calories: a?.caloriesOut ?? null,
    distance: a?.distances?.find((d) => d.activity === "total")?.distance ?? null,
    active_min: (a?.fairlyActiveMinutes ?? 0) + (a?.veryActiveMinutes ?? 0),
    sleep_min: s?.totalMinutesAsleep ?? null,
    resting_hr: h ?? null,
  }, { onConflict: "user_id,date" });
}
