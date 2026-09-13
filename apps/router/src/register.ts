import type { AppConfig } from "@vigil/config";
import type { HcsLogger } from "@vigil/hcs";
import type { ServiceDescriptor } from "@vigil/types";

export async function registerRouter(config: AppConfig, hcs: HcsLogger): Promise<void> {
  const descriptor: ServiceDescriptor = {
    id: "vigil-router",
    name: "Vigil Liquidity Router",
    baseUrl: `http://localhost:${config.PORT_ROUTER}`,
    kind: "SWAP",
    pricing: {
      asset: "HBAR",
      feeBps: config.ROUTER_FEE_BPS,
    },
    metered: false,
    ownerAccount: config.routerLpAccount,
    registeredAt: new Date().toISOString(),
  };

  try {
    await hcs.emit("SERVICE_REGISTERED", {
      id: descriptor.id,
      name: descriptor.name,
      baseUrl: descriptor.baseUrl,
      kind: descriptor.kind,
      ownerAccount: descriptor.ownerAccount,
      feeBps: config.ROUTER_FEE_BPS,
    });
    console.log("  ✓ Router registration event emitted to HCS");
  } catch (err: any) {
    console.warn(`  ⚠️ Failed to emit router registration to HCS: ${err.message}`);
  }

  const directoryUrl = `http://localhost:${config.PORT_DIRECTORY}/register`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(directoryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(descriptor),
      });
      if (res.ok) {
        console.log(`  ✓ Router registered with directory at ${directoryUrl}`);
        return;
      }
    } catch {
      // directory service may not be online yet
    }
    await new Promise((r) => setTimeout(r, attempt * 600));
  }
  console.log("  ℹ️ Directory service not online yet; proceeding with standalone Router service.");
}
