export type GscRow<K extends string = string> = {
  [key in K]: string;
} & {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type QueryRow = GscRow<"query">;
export type PageRow = GscRow<"page">;

export type RowDelta = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type RowWithDelta<T> = T & {
  previous: T | null;
  delta: RowDelta | null;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type Ranges = {
  current: DateRange;
  previous: DateRange;
  yearOverYear: DateRange;
};

export type Totals = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type TotalsBlock = {
  current: Totals;
  previous: Totals;
  yearOverYear: Totals;
  deltaPrev: RowDelta;
  deltaYoY: RowDelta;
};

export type Site = {
  siteUrl: string;
  permissionLevel: string;
};

export type SitePerformance = {
  siteUrl: string;
  ranges: Ranges;
  blogPattern: string;
  totals: TotalsBlock;
  queries: RowWithDelta<QueryRow>[];
  queriesYoY: QueryRow[];
  pages: RowWithDelta<PageRow>[];
  pagesYoY: PageRow[];
  opportunities: QueryRow[];
  blogPages: RowWithDelta<PageRow>[];
};
