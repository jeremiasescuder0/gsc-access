// Tipos que reflejan lo que devuelve core/ga4-fetch.js. Mantener sincronizado a mano.

export type Ga4Property = {
  propertyId: string;
  propertyName: string;
  accountName: string;
};

export type Ga4Totals = {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  engagedSessions: number;
  engagementRate: number; // 0-1
  avgEngagementTime: number; // segundos por sesión
  screenPageViews: number;
  keyEvents: number;
};

export type Ga4DateRange = { startDate: string; endDate: string };

export type Ga4Overview = {
  propertyId: string;
  ranges: { current: Ga4DateRange; previous: Ga4DateRange; yearOverYear: Ga4DateRange };
  totals: {
    current: Ga4Totals;
    previous: Ga4Totals;
    yearOverYear: Ga4Totals;
    deltaPrev: Ga4Totals;
    deltaYoY: Ga4Totals;
  };
  channels: { channel: string; sessions: number; engagedSessions: number; engagementRate: number; keyEvents: number }[];
  landingPages: {
    page: string;
    sessions: number;
    engagedSessions: number;
    engagementRate: number;
    avgEngagementTime: number;
    keyEvents: number;
  }[];
  devices: { device: string; sessions: number; engagementRate: number; keyEvents: number }[];
  daily: { date: string; sessions: number; keyEvents: number }[];
  keyEventsByName: { eventName: string; count: number }[];
};

export type Ga4PagePerformance = {
  sessions: number;
  totalUsers: number;
  engagedSessions: number;
  engagementRate: number;
  avgEngagementTime: number;
  keyEvents: number;
};
