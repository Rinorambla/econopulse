// Centralized color palette to ensure consistent colors across all pages
// Use these constants instead of hard-coded hex values.
// If you need to adjust a brand/bull/bear color do it here once.

export const Palette = {
  // Brand / Primary
  primary: '#3B82F6',        // blue-500
  primaryStrong: '#1D4ED8',  // blue-700
  focus: '#6366F1',          // indigo-500

  // Sentiment
  bull: '#16A34A',           // green-600
  bullAlt: '#22C55E',        // green-500
  bear: '#DC2626',           // red-600
  bearAlt: '#EF4444',        // red-500
  neutral: '#94A3B8',        // slate-400

  // Warnings / States
  warning: '#F59E0B',        // amber-500
  caution: '#F97316',        // orange-500
  amber: '#EAB308',          // amber-400
  danger: '#DC2626',         // alias of bear

  // Accents / Metrics
  accent: '#FBBF24',         // amber-300
  accentAlt: '#A78BFA',      // violet-300

  // UI / Structural
  grid: '#334155',           // slate-700
  border: '#475569',         // slate-600
  backdrop: '#0F172A',       // slate-900
  panel: '#1E293B',          // slate-800
};

export type PaletteKey = keyof typeof Palette;

export function getColor(key: PaletteKey): string {
  return Palette[key];
}
