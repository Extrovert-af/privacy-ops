export type RiskBand = "low" | "medium" | "high" | "critical";

/// Severity is likelihood (1-5) x impact (1-5), so scores run 1-25.
/// These thresholds are the single source of truth: the dashboard, the
/// compliance report and the risk register all band identically so a
/// "high" risk never appears as "medium" on another screen.
export const RISK_BANDS: { band: RiskBand; label: string; min: number; max: number }[] = [
  { band: "critical", label: "Critical", min: 15, max: 25 },
  { band: "high", label: "High", min: 10, max: 14 },
  { band: "medium", label: "Medium", min: 5, max: 9 },
  { band: "low", label: "Low", min: 1, max: 4 },
];

const BAND_COLORS: Record<RiskBand, string> = {
  critical: "text-red-700 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-emerald-600 dark:text-emerald-400",
};

export function riskScore(likelihood: number, impact: number): number {
  return Math.max(1, Math.min(25, likelihood * impact));
}

export function riskBand(score: number): RiskBand {
  const match = RISK_BANDS.find((b) => score >= b.min && score <= b.max);
  return match?.band ?? "low";
}

export function riskBandLabel(score: number): string {
  return RISK_BANDS.find((b) => score >= b.min && score <= b.max)?.label ?? "Low";
}

export function riskBandColor(score: number): string {
  return BAND_COLORS[riskBand(score)];
}
