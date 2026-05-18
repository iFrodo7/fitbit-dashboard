export interface FitbitActivity {
  activities: unknown[];
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    floors: number;
    steps: number;
  };
  summary: {
    steps: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    fairlyActiveMinutes: number;
    veryActiveMinutes: number;
    sedentaryMinutes: number;
    lightlyActiveMinutes: number;
    floors: number;
    elevation: number;
  };
}

export interface FitbitSleep {
  sleep: Array<{
    dateOfSleep: string;
    duration: number;
    efficiency: number;
    isMainSleep: boolean;
    levels: unknown;
    minutesAfterWakeup: number;
    minutesAsleep: number;
    minutesAwake: number;
    minutesToFallAsleep: number;
    startTime: string;
    endTime: string;
    timeInBed: number;
    type: string;
  }>;
  summary: {
    stages: { deep: number; light: number; rem: number; wake: number };
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

export interface FitbitHeartRate {
  "activities-heart": Array<{
    dateTime: string;
    value: {
      customHeartRateZones: unknown[];
      heartRateZones: Array<{
        caloriesOut: number;
        max: number;
        min: number;
        minutes: number;
        name: string;
      }>;
      restingHeartRate: number;
    };
  }>;
  "activities-heart-intraday"?: {
    dataset: Array<{ time: string; value: number }>;
    datasetInterval: number;
    datasetType: string;
  };
}

export interface FitbitProfile {
  user: {
    avatar: string;
    displayName: string;
    fullName: string;
    gender: string;
    age: number;
    height: number;
    weight: number;
    memberSince: string;
    timezone: string;
  };
}

export interface DashboardData {
  activity: FitbitActivity | null;
  sleep: FitbitSleep | null;
  heartRate: FitbitHeartRate | null;
  profile: FitbitProfile | null;
}
