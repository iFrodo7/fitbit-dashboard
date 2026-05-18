"use client";

import useSWR from "swr";
import type { FitbitActivity, FitbitSleep, FitbitHeartRate, FitbitProfile } from "@/lib/fitbit/types";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutos — respeta rate limit de Fitbit

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useActivity(date?: string) {
  const url = `/api/fitbit/activity${date ? `?date=${date}` : ""}`;
  return useSWR<FitbitActivity>(url, fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: true,
  });
}

export function useSleep(date?: string) {
  const url = `/api/fitbit/sleep${date ? `?date=${date}` : ""}`;
  return useSWR<FitbitSleep>(url, fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: false,
  });
}

export function useHeartRate(date?: string) {
  const url = `/api/fitbit/heart${date ? `?date=${date}` : ""}`;
  return useSWR<FitbitHeartRate>(url, fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: true,
  });
}

export function useProfile() {
  return useSWR<FitbitProfile>("/api/fitbit/profile", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000, // 1 hora
  });
}
