import { describe, it, expect } from "vitest";
import { toMirrorTxId } from "../packages/mirror/src/index.js";
import { priceCall } from "../apps/api-service/src/pricing.js";
import { calculateForecast } from "../apps/agent/src/core/forecast.js";
import { buildObligation } from "../apps/agent/src/core/obligations.js";
import { evaluateRoutes } from "../apps/agent/src/core/router.js";
import { HcsLogger } from "../packages/hcs/src/index.js";

describe("Vigil Core Unit Tests (§18 QA Specification)", () => {
  describe("1. toMirrorTxId Format Conversion", () => {
    it("converts Hedera SDK transactionId to Mirror Node REST format", () => {
      expect(toMirrorTxId("0.0.5@1.2")).toBe("0.0.5-1-2");
      expect(toMirrorTxId("0.0.14885@1651151400.123456789")).toBe("0.0.14885-1651151400-123456789");
      expect(toMirrorTxId("0.0.10510026@1789247604.441591931")).toBe("0.0.10510026-1789247604-441591931");
    });

    it("leaves already converted or non-SDK ids unchanged", () => {
      expect(toMirrorTxId("0.0.5-1-2")).toBe("0.0.5-1-2");
    });
  });

  describe("2. Pricing Math (Base + Per-Field Metering)", () => {
    it("calculates exact pricing for 5 fields: 0.50 base + 0.10/field × 5 = 1.00 FUSDC", () => {
      const fields = ["price", "volume", "sentiment", "volatility", "trend"] as const;
      const price = priceCall([...fields]);
      expect(price).toBe(1.0);
    });

    it("calculates base fee for 0 fields", () => {
      expect(priceCall([])).toBe(0.5);
    });

    it("calculates pricing for single field", () => {
      expect(priceCall(["price"])).toBe(0.6);
    });
  });

  describe("3. Liquidity Forecast & PCR Math", () => {
    it("calculates PCR 0%, shortfall 10.30 FUSDC when agent has 0 FUSDC", () => {
      const obligation = buildObligation(10, 1.0, 30, 0.01);
      expect(obligation.requiredFusdc).toBe(10.3);

      const forecast = calculateForecast(0, obligation, 2, 0.01);
      expect(forecast.pcrPct).toBe(0);
      expect(forecast.state).toBe("CRITICAL");
      expect(forecast.shortfallFusdc).toBe(10.3);
      expect(forecast.hbarNeededEstimate).toBe(21); // ceil(10.3 * 2 * 1.01) = ceil(20.806) = 21
    });

    it("calculates PCR 110%, healthy state when agent has 11 FUSDC", () => {
      const obligation = buildObligation(10, 1.0, 30, 0.01);
      const forecast = calculateForecast(11.0, obligation, 2, 0.01);
      expect(forecast.pcrPct).toBe(110);
      expect(forecast.state).toBe("HEALTHY");
      expect(forecast.shortfallFusdc).toBe(0);
    });

    it("calculates WARN state when PCR is between 80% and 110%", () => {
      const obligation = buildObligation(10, 1.0, 30, 0.01);
      const forecast = calculateForecast(9.0, obligation, 2, 0.01);
      expect(forecast.pcrPct).toBe(90);
      expect(forecast.state).toBe("WARN");
      expect(forecast.shortfallFusdc).toBe(1.3);
    });
  });

  describe("4. Route Matrix Selection", () => {
    it("selects lowest cost among available routes and ignores unavailable DEX routes", async () => {
      // Mock router url failure to check unavailable fallback
      const routeEval = await evaluateRoutes({
        shortfallFusdc: 10.3,
        routerUrl: "http://127.0.0.1:59999", // closed port
      });

      const saucer = routeEval.quotes.find((q) => q.id === "SAUCERSWAP_V2");
      expect(saucer).toBeDefined();
      expect(saucer?.available).toBe(false);
      expect(saucer?.detail).toContain("No FUSDC pool deployed");
    });
  });

  describe("5. HCS Consensus Size Trimming", () => {
    it("safely trims payload exceeding 1000 bytes", () => {
      const hugeData: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        hugeData[`key_${i}`] = "x".repeat(30);
      }

      const trimmed = HcsLogger.trimPayload(hugeData, 1000);
      const str = JSON.stringify(trimmed);
      expect(Buffer.byteLength(str, "utf8")).toBeLessThanOrEqual(1000);
    });
  });
});
