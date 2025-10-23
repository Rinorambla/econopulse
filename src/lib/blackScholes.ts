// Server-only Black-Scholes utilities for option Greeks
// NOTE: Keep this file free of any browser-only APIs.

const SQRT2PI = Math.sqrt(2 * Math.PI);

export function nd(x: number): number {
  // Standard normal PDF
  return Math.exp(-0.5 * x * x) / SQRT2PI;
}

export function ndCdf(x: number): number {
  // Abramowitz and Stegun approximation for standard normal CDF
  const k = 1 / (1 + 0.2316419 * Math.abs(x));
  const a1 = 0.319381530;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const poly = ((((a5 * k + a4) * k + a3) * k + a2) * k + a1) * k;
  const cdf = 1 - nd(Math.abs(x)) * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

export function d1(S: number, K: number, r: number, sigma: number, T: number): number {
  // Protect against invalid inputs
  const vol = Math.max(1e-6, sigma);
  const time = Math.max(1e-8, T);
  return (Math.log(S / Math.max(1e-8, K)) + (r + 0.5 * vol * vol) * time) / (vol * Math.sqrt(time));
}

export function d2(S: number, K: number, r: number, sigma: number, T: number): number {
  const _d1 = d1(S, K, r, sigma, T);
  return _d1 - Math.max(1e-6, sigma) * Math.sqrt(Math.max(1e-8, T));
}

export function callDelta(S: number, K: number, r: number, sigma: number, T: number): number {
  return ndCdf(d1(S, K, r, sigma, T));
}

export function putDelta(S: number, K: number, r: number, sigma: number, T: number): number {
  return callDelta(S, K, r, sigma, T) - 1; // put-call parity
}

export function gamma(S: number, K: number, r: number, sigma: number, T: number): number {
  const _d1 = d1(S, K, r, sigma, T);
  return nd(_d1) / (S * Math.max(1e-6, sigma) * Math.sqrt(Math.max(1e-8, T)));
}
