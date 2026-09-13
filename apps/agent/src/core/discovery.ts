import type { ServiceDescriptor, X402PaymentRequirement } from "@vigil/types";

export interface DiscoveredService {
  descriptor: ServiceDescriptor;
  x402Config?: {
    requirements: X402PaymentRequirement[];
  };
  quotedCostPerCallFusdc: number;
}

export async function discoverDataService(
  directoryUrl: string,
  fallbackApiUrl?: string
): Promise<DiscoveredService> {
  let descriptor: ServiceDescriptor | null = null;

  // 1. Discover via Directory
  try {
    const res = await fetch(`${directoryUrl}/services`);
    if (res.ok) {
      const services = (await res.json()) as ServiceDescriptor[];
      descriptor = services.find((s) => s.kind === "DATA") || null;
    }
  } catch (err: any) {
    console.warn(`[Discovery] Directory query failed: ${err.message}. Checking fallback.`);
  }

  // Fallback to configured api-service if directory hasn't registered yet
  if (!descriptor && fallbackApiUrl) {
    descriptor = {
      id: "market-data-api",
      name: "Hedera Market Data Feed (Direct)",
      baseUrl: fallbackApiUrl,
      kind: "DATA",
      pricing: {
        asset: "FUSDC",
        baseFusdc: 0.5,
        perFieldFusdc: 0.1,
      },
      metered: true,
      ownerAccount: "0.0.10510028",
      registeredAt: new Date().toISOString(),
    };
  }

  if (!descriptor) {
    throw new Error("No DATA service found in directory or configuration");
  }

  // 2. Fetch /.well-known/x402
  let x402Config: any = null;
  try {
    const wellKnownRes = await fetch(`${descriptor.baseUrl}/.well-known/x402`);
    if (wellKnownRes.ok) {
      x402Config = await wellKnownRes.json();
    }
  } catch {
    // Non-blocking
  }

  // 3. Fetch price quote for standard 5 fields
  let quotedCostPerCallFusdc = 1.0;
  try {
    const priceRes = await fetch(
      `${descriptor.baseUrl}/price?fields=price,volume,sentiment,volatility,trend`
    );
    if (priceRes.ok) {
      const priceData = (await priceRes.json()) as any;
      if (typeof priceData.totalFusdc === "number") {
        quotedCostPerCallFusdc = priceData.totalFusdc;
      }
    }
  } catch {
    // Keep 1.0 default
  }

  return {
    descriptor,
    x402Config,
    quotedCostPerCallFusdc,
  };
}
