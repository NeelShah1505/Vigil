import type { Field } from "@vigil/types";

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function generateMarketData(
  symbol: string,
  fields: Field[],
  dayIndex = Math.floor(Date.now() / 86_400_000)
): Record<Field, string | number> {
  const hash = simpleHash(`${symbol.toUpperCase()}-${dayIndex}`);
  const result: Partial<Record<Field, string | number>> = {};

  for (const field of fields) {
    switch (field) {
      case "price": {
        // e.g. 0.0850 - 0.2850
        const priceVal = 0.08 + (hash % 200) / 1000;
        result.price = Number(priceVal.toFixed(4));
        break;
      }
      case "volume": {
        const vol = 1_000_000 + (hash % 5_000_000);
        result.volume = vol;
        break;
      }
      case "sentiment": {
        const sentiments = ["BULLISH", "VERY_BULLISH", "NEUTRAL", "CAUTIOUS"];
        result.sentiment = sentiments[hash % sentiments.length]!;
        break;
      }
      case "volatility": {
        const volPct = 1.2 + (hash % 80) / 10;
        result.volatility = `${volPct.toFixed(1)}%`;
        break;
      }
      case "trend": {
        const trends = ["UPWARD", "STRONG_UPWARD", "CONSOLIDATING", "ACCUMULATION"];
        result.trend = trends[hash % trends.length]!;
        break;
      }
    }
  }

  return result as Record<Field, string | number>;
}
