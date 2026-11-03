// Shared config for the /economics heat map (safe for client and server).

export type HeatKpi = {
  id: string;
  label: string;
  short: string;
  unit: string;
  /** Which direction reads as healthy, so the colour scale can be oriented. */
  good: 'up' | 'down' | 'none';
};

export const HEATMAP_KPIS: HeatKpi[] = [
  { id: 'NA.GDP.Yoy', label: 'GDP growth YoY', short: 'GDP', unit: '%', good: 'up' },
  { id: 'PR.CPI.Yoy', label: 'Inflation YoY', short: 'CPI', unit: '%', good: 'down' },
  { id: 'IR.POL', label: 'Policy rate', short: 'RATE', unit: '%', good: 'none' },
  { id: 'LB.UR', label: 'Unemployment', short: 'UNEMP', unit: '%', good: 'down' },
  { id: 'ST.IP.Yoy', label: 'Industrial production YoY', short: 'IP', unit: '%', good: 'up' },
  { id: 'HS.HPI.Yoy', label: 'House prices YoY', short: 'HPI', unit: '%', good: 'none' },
  { id: 'GF.DEBT.GDP', label: 'Gov. debt / GDP', short: 'DEBT', unit: '%', good: 'down' },
  { id: 'GF.BAL.GDP', label: 'Budget balance / GDP', short: 'BUDG', unit: '%', good: 'up' },
  { id: 'EA.CA.GDP', label: 'Current account / GDP', short: 'CA', unit: '%', good: 'up' },
  { id: 'NA.GDP.PC.USD', label: 'GDP per capita', short: 'GDP/C', unit: 'USD', good: 'up' },
  { id: 'NA.GDP.CUR.USD', label: 'GDP (nominal)', short: 'GDP$', unit: 'USD', good: 'none' },
  { id: 'MN.FXRES', label: 'FX reserves', short: 'FXRES', unit: 'USD', good: 'none' },
];

export type HeatCell = { v: number; prev: number | null; date: string } | null;

export type HeatCountry = {
  iso3: string;
  iso2: string;
  name: string;
  values: Record<string, HeatCell>;
};

export type HeatmapPayload = {
  ok: true;
  kpis: HeatKpi[];
  countries: HeatCountry[];
  updatedAt: string;
};
