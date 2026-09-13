import type { AppConfig } from "@vigil/config";
import type { HcsLogger } from "@vigil/hcs";
import type { ServiceDescriptor } from "@vigil/types";

export async function registerService(config: AppConfig, hcs: HcsLogger): Promise<void> {
  const descriptor: ServiceDescriptor = {
    id: "vigil-market-intelligence",
    name: "Vigil Market Intelligence API",
    baseUrl: `http://localhost:${config.PORT_API}`,
    kind: "DATA",
    pricing: {
      asset: "FUSDC",
      baseFusdc: config.BASE_FEE_FUSDC,
      perFieldFusdc: config.PER_FIELD_FUSDC,
    },
    metered: true,
    ownerAccount: config.merchantAccount,
    registeredAt: new Date().toISOString(),
  };

  // 1. Emit SERVICE_REGISTERED to HCS
  try {
    await hcs.emit("SERVICE_REGISTERED", {
      id: descriptor.id,
      name: descriptor.name,
      baseUrl: descriptor.baseUrl,
      kind: descriptor.kind,
      ownerAccount: descriptor.ownerAccount,
      metered: descriptor.metered,
      pricing: descriptor.pricing,
    });
    console.log("  ✓ Service registration event emitted to HCS");
  } catch (err: any) {
    console.warn(`  ⚠️ Failed to emit SERVICE_REGISTERED to HCS: ${err.message}`);
  }

  // 2. Register into directory with retry backoff
  const directoryUrl = `http://localhost:${config.PORT_DIRECTORY}/register`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(directoryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(descriptor),
      });
      if (res.ok) {
        console.log(`  ✓ Service registered with directory at ${directoryUrl}`);
        return;
      }
    } catch {
      // directory may be starting up concurrently
    }
    await new Promise((r) => setTimeout(r, attempt * 600));
  }
  console.log("  ℹ️ Directory service not online yet; proceeding with standalone API service.");
}
