// The Search Analytics API lags real time by ~2-3 days — data for "today"
// and the day or two before it usually isn't processed yet on Google's side.
// Every GSC query should end this many days back, not "today", or the most
// recent days in the range silently come back empty. Google's own GSC
// dashboard can show same-day data because it reads from an internal,
// near-real-time pipeline that isn't exposed through the public API.
export const GSC_DATA_LAG_DAYS = 3

export function gscDateRange(daysBack: number): { startDate: string; endDate: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const ago = (days: number) => fmt(new Date(Date.now() - days * 86_400_000))
  return { startDate: ago(daysBack + GSC_DATA_LAG_DAYS), endDate: ago(GSC_DATA_LAG_DAYS) }
}
