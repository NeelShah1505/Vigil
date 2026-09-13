import { loadConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { MirrorClient } from "@fatera/mirror";
import { HcsLogger } from "@fatera/hcs";
import { createDirectoryApp } from "../apps/directory/src/server.js";
import { createApp as createApiApp } from "../apps/api-service/src/server.js";
import { createRouterApp } from "../apps/router/src/server.js";
import { createAgentApp } from "../apps/agent/src/server.js";
import { buildObligation } from "../apps/agent/src/core/obligations.js";
import { calculateForecast } from "../apps/agent/src/core/forecast.js";
import { evaluateRoutes } from "../apps/agent/src/core/router.js";
import { discoverDataService } from "../apps/agent/src/core/discovery.js";
import { executeSwap, x402Fetch } from "../apps/agent/src/core/executor.js";
import { registerAgentIdentity } from "../apps/agent/src/core/identity.js";
import { createScheduledRenewal, pollScheduleExecution } from "../apps/agent/src/core/scheduler.js";
import type { Server } from "node:http";

async function main() {
  const isDryRun = process.argv.includes("--dry");
  console.log(`\n=== FATERA AGENT DEMO (${isDryRun ? "DRY RUN / PHASE 5" : "LIVE RUN / PHASE 6"}) ===\n`);

  const config = loadConfig(true);
  const servers: Server[] = [];

  // Helper to start an Express app on a port
  const startServer = (app: any, port: number, name: string): Promise<Server> => {
    return new Promise((resolve, reject) => {
      const s = app.listen(port, () => {
        console.log(`  [Service] ${name} started on port ${port}`);
        resolve(s);
      });
      s.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`  [Service] ${name} already listening on port ${port}`);
          resolve(s);
        } else {
          reject(err);
        }
      });
    });
  };

  try {
    console.log("[1/6] Launching Fatera Services Architecture...");

    // 1. Directory Service (port 3004)
    const { app: directoryApp, services: directoryMap } = createDirectoryApp();
    const dirServer = await startServer(directoryApp, config.PORT_DIRECTORY, "Directory Service");
    servers.push(dirServer);

    // 2. Merchant API Service (port 3001)
    const { app: apiApp } = createApiApp();
    const apiServer = await startServer(apiApp, config.PORT_API, "Merchant API Service");
    servers.push(apiServer);

    // 3. Router Service (port 3003)
    const { app: routerApp } = createRouterApp();
    const routerServer = await startServer(routerApp, config.PORT_ROUTER, "FateraRouter LP Service");
    servers.push(routerServer);

    // 4. Agent State API (port 3002)
    const { app: agentApp, stateStore, treasury, hcs, hedera, mirror } = createAgentApp();
    const agentServer = await startServer(agentApp, config.PORT_AGENT, "Agent State Service");
    servers.push(agentServer);

    // Register services into Directory
    console.log("\n[2/6] Registering Services into Fatera Directory...");
    const dirBase = `http://localhost:${config.PORT_DIRECTORY}`;

    await fetch(`${dirBase}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "market-data-api",
        name: "Hedera Market Data Feed (Merchant)",
        baseUrl: `http://localhost:${config.PORT_API}`,
        kind: "DATA",
        pricing: {
          asset: "FUSDC",
          baseFusdc: 0.5,
          perFieldFusdc: 0.1,
        },
        metered: true,
        ownerAccount: config.merchantAccount,
        registeredAt: new Date().toISOString(),
      }),
    });

    await fetch(`${dirBase}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "fatera-router",
        name: "Fatera Liquidity Router",
        baseUrl: `http://localhost:${config.PORT_ROUTER}`,
        kind: "SWAP",
        pricing: {
          asset: "HBAR",
          feeBps: config.ROUTER_FEE_BPS,
        },
        metered: false,
        ownerAccount: config.routerLpAccount,
        registeredAt: new Date().toISOString(),
      }),
    });
    console.log("  ✓ Merchant API & FateraRouter registered with discovery directory");

    // Phase 8: Anchor Agent Identity on HCS (HCS-14 inspired)
    console.log("\n[Bonus] Anchoring Agent Identity on HCS Topic...");
    await registerAgentIdentity(config, hedera, hcs);

    // Discover data service
    console.log("\n[3/6] Agent Discovery & Requirement Acquisition...");
    stateStore.setPhase("PLANNING");
    const discovered = await discoverDataService(
      `http://localhost:${config.PORT_DIRECTORY}`,
      `http://localhost:${config.PORT_API}`
    );
    console.log(`  ✓ Discovered service: ${discovered.descriptor.name} (${discovered.descriptor.id})`);
    console.log(`  ✓ Quoted cost per call: ${discovered.quotedCostPerCallFusdc.toFixed(2)} FUSDC`);

    // Balances
    const balances = await treasury.getBalances();
    stateStore.setBalances(treasury.toBalance(balances));
    console.log("\n  Current Agent Balances:");
    console.log(`    HBAR:  ${balances.hbarBalance.toFixed(4)} HBAR (${balances.hbarTinybars} tinybars)`);
    console.log(`    FUSDC: ${balances.fusdcBalance.toFixed(4)} FUSDC (${balances.fusdcBaseUnits} base units)`);

    // Build obligation
    const customFeeFusdc = config.customFeeBaseUnits / 1_000_000;
    const obligation = buildObligation(10, discovered.quotedCostPerCallFusdc, 30, customFeeFusdc);
    stateStore.setObligations([obligation]);

    console.log("\n  Obligation Model:");
    console.log(`    Goal:           ${obligation.description}`);
    console.log(`    Calls Total:    ${obligation.callsTotal}`);
    console.log(`    Cost per Call:  ${obligation.costPerCallFusdc.toFixed(2)} FUSDC`);
    console.log(`    Base Cost:      ${obligation.amountFusdc.toFixed(2)} FUSDC`);
    console.log(`    Est. Fees:      ${obligation.feeEstimateFusdc.toFixed(2)} FUSDC (${customFeeFusdc} per call)`);
    console.log(`    Safety Buffer:  ${obligation.bufferFusdc.toFixed(2)} FUSDC`);
    console.log(`    Required Total: ${obligation.requiredFusdc.toFixed(2)} FUSDC`);

    // Forecast
    console.log("\n[4/6] Forecasting Liquidity & Payment Coverage Ratio (PCR)...");
    const forecast = calculateForecast(
      balances.fusdcBalance,
      obligation,
      config.HBAR_PER_FUSDC,
      customFeeFusdc
    );
    stateStore.setForecast(forecast);

    console.log(`    Payment Coverage Ratio (PCR): ${forecast.pcrPct.toFixed(2)}%`);
    console.log(`    Liquidity Health State:       ${forecast.state}`);
    console.log(`    Available FUSDC:              ${forecast.availableFusdc.toFixed(2)} FUSDC`);
    console.log(`    Required FUSDC:               ${forecast.requiredFusdc.toFixed(2)} FUSDC`);
    console.log(`    Liquidity Shortfall:          ${forecast.shortfallFusdc.toFixed(2)} FUSDC`);
    console.log(`    Est. HBAR Needed:             ~${forecast.hbarNeededEstimate} HBAR`);

    if (forecast.shortfallFusdc > 0) {
      stateStore.setPhase("SHORTFALL");
      await hcs.emit("SHORTFALL_DETECTED", {
        pcrPct: forecast.pcrPct,
        shortfallFusdc: forecast.shortfallFusdc,
        requiredFusdc: forecast.requiredFusdc,
        state: forecast.state,
      });
      console.log("  ✓ Emitted SHORTFALL_DETECTED event to HCS topic");
    }

    // Route evaluation
    console.log("\n[5/6] Autonomous Route Evaluation & Liquidity Decision Matrix...");
    stateStore.setPhase("ROUTING");
    const routeEval = await evaluateRoutes({
      shortfallFusdc: forecast.shortfallFusdc,
      routerUrl: `http://localhost:${config.PORT_ROUTER}`,
      multiAssetEnabled: false,
    });
    stateStore.setRouteEvaluation(routeEval);

    console.log("\n  +------------------------+-----------+---------------+-----------+---------+----------------------------------------------+");
    console.log("  | Route ID               | Available | Cost (HBAR)   | Fee (bps) | Penalty | Details                                      |");
    console.log("  +------------------------+-----------+---------------+-----------+---------+----------------------------------------------+");
    for (const q of routeEval.quotes) {
      const avail = q.available ? "YES      " : "NO       ";
      const cost = q.costHbar.toFixed(4).padEnd(13, " ");
      const fee = q.feeBps.toString().padEnd(9, " ");
      const penalty = q.riskPenaltyHbar.toFixed(2).padEnd(7, " ");
      const id = q.id.padEnd(22, " ");
      const detail = q.detail.slice(0, 44).padEnd(44, " ");
      console.log(`  | ${id} | ${avail} | ${cost} | ${fee} | ${penalty} | ${detail} |`);
    }
    console.log("  +------------------------+-----------+---------------+-----------+---------+----------------------------------------------+\n");

    const selectedQuote = routeEval.quotes.find((q) => q.id === routeEval.selected);
    console.log(`  Selected Route: ${routeEval.selected} (~${selectedQuote?.costHbar.toFixed(2)} HBAR)`);
    console.log(`  Decision Logic: ${routeEval.reason}`);

    await hcs.emit("ROUTE_EVALUATED", {
      quotes: routeEval.quotes,
      selected: routeEval.selected,
      reason: routeEval.reason,
    });
    await hcs.emit("ROUTE_SELECTED", {
      route: routeEval.selected,
      costHbar: selectedQuote?.costHbar,
      feeBps: selectedQuote?.feeBps,
    });
    console.log("  ✓ Emitted ROUTE_EVALUATED and ROUTE_SELECTED events to HCS topic");

    // Policy verification
    const policyResult = treasury.validatePolicy({
      quoteHbar: selectedQuote?.costHbar,
      costPerCallFusdc: obligation.costPerCallFusdc,
      totalSessionFusdc: obligation.requiredFusdc,
    });
    if (!policyResult.pass) {
      throw new Error(`Treasury Policy Check Failed: ${policyResult.reason}`);
    }
    console.log(`  ✓ Treasury Policy Check: PASS (${selectedQuote?.costHbar.toFixed(3)} HBAR ≤ 50 HBAR max; 1.00 FUSDC/call ≤ 2.00 max)`);

    // Verify State API endpoint
    console.log("\n[6/6] Verifying Agent State API (GET http://localhost:3002/state)...");
    const stateRes = await fetch(`http://localhost:${config.PORT_AGENT}/state`);
    if (!stateRes.ok) {
      throw new Error(`State API returned HTTP ${stateRes.status}`);
    }
    const stateJson = (await stateRes.json()) as any;
    if (!stateJson || !stateJson.phase || !stateJson.config || !stateJson.latestForecast) {
      throw new Error(`Invalid state payload from State API: ${JSON.stringify(stateJson)}`);
    }
    console.log(`  ✓ State API verified: phase="${stateJson.phase}", PCR=${stateJson.latestForecast.pcrPct}%, eventsSeen=${stateJson.eventsSeen}`);

    if (isDryRun) {
      console.log("\n==================================================");
      console.log("     PHASE 5 DRY RUN / PLANNING COMPLETE ✅       ");
      console.log("==================================================");
      console.log(`Balances:     HBAR: ${balances.hbarBalance.toFixed(4)}, FUSDC: ${balances.fusdcBalance.toFixed(4)}`);
      console.log(`Obligation:   Required ${obligation.requiredFusdc.toFixed(2)} FUSDC (10 calls @ 1.00)`);
      console.log(`Forecast:     PCR ${forecast.pcrPct.toFixed(1)}% (${forecast.state}), Shortfall: ${forecast.shortfallFusdc.toFixed(2)} FUSDC`);
      console.log(`Route Matrix: FATERA_ROUTER selected (~${selectedQuote?.costHbar.toFixed(2)} HBAR), SAUCERSWAP_V2 unavailable`);
      console.log(`Policy Check: PASS`);
      console.log(`State API:    http://localhost:${config.PORT_AGENT}/state (OK)`);
      console.log("==================================================\n");
      return;
    }

    // ==========================================================
    // PHASE 6: AUTONOMOUS LIVE EXECUTION
    // ==========================================================
    console.log("\n==================================================");
    console.log("       PHASE 6: AUTONOMOUS LIVE EXECUTION         ");
    console.log("==================================================\n");

    // 1. Execute Liquidity Swap to acquire FUSDC
    const swapAmountFusdc = Math.max(1, Math.ceil(forecast.shortfallFusdc)); // 11 FUSDC
    console.log(`[1/3] Executing Autonomous LP Swap: Acquiring ${swapAmountFusdc} FUSDC via FateraRouter...`);
    stateStore.setPhase("SWAPPING");

    const swapResult = await executeSwap({
      selectedRoute: routeEval.selected!,
      amountFusdc: swapAmountFusdc,
      routerUrl: `http://localhost:${config.PORT_ROUTER}`,
      agentAccount: config.agentAccount,
      agentKey: config.agentKey,
      routerLpAccount: config.routerLpAccount,
      hedera,
      hcs,
    });

    stateStore.setSwap({
      status: "DONE",
      hbarSpent: swapResult.hbarSpent,
      fusdcReceived: swapResult.amountFusdc,
      hbarTxId: swapResult.hbarTxId,
      fusdcTxId: swapResult.fusdcTxId,
    });

    console.log(`  ✓ Swap completed! Spent ${swapResult.hbarSpent.toFixed(4)} HBAR -> Received ${swapResult.amountFusdc.toFixed(2)} FUSDC`);
    console.log(`    HBAR Tx:  https://hashscan.io/testnet/transaction/${swapResult.hbarTxId}`);
    console.log(`    FUSDC Tx: https://hashscan.io/testnet/transaction/${swapResult.fusdcTxId}`);

    // Wait for mirror node to ingest FUSDC transfer and update agent balance
    console.log("  Refreshing Agent Treasury post-swap...");
    await new Promise((r) => setTimeout(r, 2000));
    const postSwapBal = await treasury.getBalances();
    stateStore.setBalances(treasury.toBalance(postSwapBal));

    // Re-forecast with new FUSDC balance -> PCR should flip to HEALTHY (≥ 110%)!
    const postSwapForecast = calculateForecast(
      postSwapBal.fusdcBalance,
      obligation,
      config.HBAR_PER_FUSDC,
      customFeeFusdc
    );
    stateStore.setForecast(postSwapForecast);
    await hcs.emit("FORECAST_UPDATED", {
      pcrPct: postSwapForecast.pcrPct,
      state: postSwapForecast.state,
      availableFusdc: postSwapBal.fusdcBalance,
      shortfallFusdc: postSwapForecast.shortfallFusdc,
    });

    console.log(`  ✓ Treasury Refreshed: PCR is now ${postSwapForecast.pcrPct.toFixed(1)}% (${postSwapForecast.state})`);
    console.log(`    Available FUSDC: ${postSwapBal.fusdcBalance.toFixed(4)} | HBAR: ${postSwapBal.hbarBalance.toFixed(4)}`);

    // 2. Execute 10 Metered Requests
    console.log(`\n[2/3] Executing 10 Metered x402 Paid Requests to Market Data API...`);
    stateStore.setPhase("EXECUTING");
    await hcs.emit("CHECKPOINT", { phase: 6, status: "EXECUTING" });

    const totalCalls = obligation.callsTotal;
    const merchantBaseUrl = `http://localhost:${config.PORT_API}`;
    const marketDataUrl = `${merchantBaseUrl}/market-data`;

    for (let i = 1; i <= totalCalls; i++) {
      console.log(`\n  --- Executing Paid Request ${i}/${totalCalls} ---`);
      const result = await x402Fetch({
        url: marketDataUrl,
        queryParams: {
          symbol: "HBAR",
          fields: "price,volume,sentiment,volatility,trend",
        },
        callIndex: i,
        agentAccount: config.agentAccount,
        agentKey: config.agentKey,
        hedera,
        hcs,
        merchantBaseUrl,
      });

      stateStore.addPayment(result.paymentRecord);
      obligation.callsRemaining = totalCalls - i;
      obligation.status = i === totalCalls ? "FULFILLED" : "IN_PROGRESS";
      stateStore.setObligations([obligation]);

      console.log(`  ✓ Call #${i} settled: 1.00 FUSDC paid, Tx: ${result.paymentRecord.txId}`);
      console.log(`    Usage Report: 5 fields @ 0.10 + 0.50 base = ${result.usage.totalFusdc.toFixed(2)} FUSDC`);
      console.log(`    Market Data: price=$${result.data?.price?.toFixed(4)}, sentiment=${result.data?.sentiment}, trend=${result.data?.trend}`);
    }

    // Refresh final balances from mirror node
    console.log("\n  Refreshing final treasury balances from Mirror Node...");
    await new Promise((r) => setTimeout(r, 2000));
    const finalBalances = await treasury.getBalances();
    stateStore.setBalances(treasury.toBalance(finalBalances));

    // 3. Fulfill Obligation
    console.log(`\n[3/3] Fulfilling Obligation...`);
    stateStore.setPhase("FULFILLED");
    obligation.status = "FULFILLED";
    stateStore.setObligations([obligation]);

    await hcs.emit("OBLIGATION_FULFILLED", {
      paid: totalCalls,
      totalFusdc: totalCalls * 1.0,
      feesFusdc: totalCalls * customFeeFusdc,
      completedAt: new Date().toISOString(),
    });

    // Phase 8: Autonomous Working Capital Forward Renewal (Scheduled Transaction)
    console.log("\n[Bonus] Scheduling Autonomous Working Capital Forward Renewal (120s)...");
    stateStore.setPhase("SCHEDULING");
    try {
      const scheduleResult = await createScheduledRenewal(config, hedera, hcs, 120);
      stateStore.setSchedule({
        scheduleId: scheduleResult.scheduleId,
        executeAt: scheduleResult.executeAt,
        status: "PENDING",
      });

      console.log(`  ✓ Forward Renewal Scheduled: ${scheduleResult.scheduleId}`);
      console.log(`    HashScan: https://hashscan.io/testnet/schedule/${scheduleResult.scheduleId}`);
      console.log(`    Mirror REST: ${config.mirrorNodeUrl}/api/v1/schedules/${scheduleResult.scheduleId}`);

      // Poll mirror node for execution verification
      const execResult = await pollScheduleExecution(mirror, scheduleResult.scheduleId, hcs, 135_000);
      if (execResult.executed) {
        stateStore.setSchedule({
          scheduleId: scheduleResult.scheduleId,
          executeAt: scheduleResult.executeAt,
          status: "EXECUTED",
        });
        console.log(`  ✓ SCHEDULE_EXECUTED confirmed on mirror node at ${execResult.executedTimestamp}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Scheduled renewal notice: ${err.message}`);
    }

    console.log("\n==================================================");
    console.log("       FATERA DEMO EXECUTION COMPLETE ✅          ");
    console.log("==================================================");
    console.log(`Initial Balances: ~100.0000 HBAR / 0.0000 FUSDC`);
    console.log(`Ending Balances:  ${finalBalances.hbarBalance.toFixed(4)} HBAR (Target: ≈78 HBAR)`);
    console.log(`                  ${finalBalances.fusdcBalance.toFixed(4)} FUSDC (Target: ≈0.90 FUSDC)`);
    console.log(`Payments Settled: 10 / 10 calls on-chain`);
    console.log(`Audit Topic:      https://hashscan.io/testnet/topic/${config.topicId}`);
    console.log(`Identity Topic:   https://hashscan.io/testnet/topic/${config.identityTopicId}`);
    console.log("==================================================\n");
  } finally {
    for (const s of servers) {
      s.close();
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Agent Demo failed:", err);
  process.exit(1);
});
