import { AccountId } from "@hashgraph/sdk";
import { HederaService } from "@vigil/hedera";
import type { HcsLogger } from "@vigil/hcs";
import type { UsageReport, PaymentRecord, RouteId } from "@vigil/types";

export interface SwapExecutionResult {
  hbarTxId: string;
  fusdcTxId: string;
  amountFusdc: number;
  hbarSpent: number;
}

export async function executeSwap(params: {
  selectedRoute: RouteId;
  amountFusdc: number;
  routerUrl: string;
  agentAccount: string;
  agentKey: string;
  routerLpAccount: string;
  hedera: HederaService;
  hcs: HcsLogger;
}): Promise<SwapExecutionResult> {
  const {
    selectedRoute,
    amountFusdc,
    routerUrl,
    agentAccount,
    agentKey,
    routerLpAccount,
    hedera,
    hcs,
  } = params;

  if (selectedRoute !== "VIGIL_ROUTER" && selectedRoute !== "FATERA_ROUTER") {
    throw new Error(`Execution for route ${selectedRoute} is not supported on testnet.`);
  }

  // 1. Fetch quote
  const quoteRes = await fetch(`${routerUrl}/quote?amountFusdc=${amountFusdc}`);
  if (!quoteRes.ok) {
    throw new Error(`Failed to get quote from router: ${quoteRes.statusText}`);
  }
  const quote = (await quoteRes.json()) as any;
  const costHbar = parseFloat(quote.amountHbar);

  // 2. Emit SWAP_INITIATED
  await hcs.emit("SWAP_INITIATED", {
    route: selectedRoute,
    amountFusdc,
    hbarCost: costHbar,
    feeBps: quote.feeBps,
    rate: quote.rate,
    payee: routerLpAccount,
  });

  // 3. Transfer HBAR from Agent to ROUTER_LP
  const agentId = AccountId.fromString(agentAccount);
  const agentPrivateKey = HederaService.parsePrivateKey(agentKey);
  const routerLpId = AccountId.fromString(routerLpAccount);

  const { txId: hbarTxId } = await hedera.transferHbar(
    agentId,
    routerLpId,
    costHbar,
    `VigilRouter swap: ${amountFusdc} FUSDC`,
    agentPrivateKey
  );

  // 4. Request Settlement
  const settleRes = await fetch(`${routerUrl}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transactionId: hbarTxId,
      payerAccountId: agentAccount,
      amountFusdc,
    }),
  });

  if (!settleRes.ok) {
    const errBody = await settleRes.text();
    throw new Error(`Swap settlement failed (${settleRes.status}): ${errBody}`);
  }

  const settleData = (await settleRes.json()) as any;
  const fusdcTxId = settleData.fusdcTxId;

  return {
    hbarTxId,
    fusdcTxId,
    amountFusdc,
    hbarSpent: costHbar,
  };
}

export interface X402ExecutionResult {
  data: any;
  usage: UsageReport;
  paymentRecord: PaymentRecord;
}

export async function x402Fetch(params: {
  url: string;
  queryParams: Record<string, string>;
  callIndex: number;
  agentAccount: string;
  agentKey: string;
  hedera: HederaService;
  hcs: HcsLogger;
  merchantBaseUrl: string;
}): Promise<X402ExecutionResult> {
  const {
    url,
    queryParams,
    callIndex,
    agentAccount,
    agentKey,
    hedera,
    hcs,
    merchantBaseUrl,
  } = params;

  const queryString = new URLSearchParams(queryParams).toString();
  const targetUrl = `${url}?${queryString}`;

  // 1. Initial unpaid request -> Expect HTTP 402
  const res1 = await fetch(targetUrl);
  if (res1.status !== 402) {
    throw new Error(`Expected 402 from ${targetUrl}, got ${res1.status}`);
  }

  const body1 = (await res1.json()) as any;
  const requirement = body1.paymentRequirements?.[0];
  if (!requirement) {
    throw new Error("Missing payment requirements in 402 response");
  }

  const amountFusdc = Number(requirement.amountBaseUnits) / 1_000_000;

  // 2. Emit PAYMENT_INITIATED
  await hcs.emit("PAYMENT_INITIATED", {
    call: callIndex,
    symbol: queryParams.symbol || "HBAR",
    amountFusdc,
    payee: requirement.payeeAccountId,
    resource: requirement.resource,
  });

  // 3. Settle on-chain FUSDC transfer
  const agentId = AccountId.fromString(agentAccount);
  const agentPrivateKey = HederaService.parsePrivateKey(agentKey);
  const payeeId = AccountId.fromString(requirement.payeeAccountId);
  const amountBaseUnits = Number(requirement.amountBaseUnits);

  const { txId } = await hedera.transferFusdc(
    agentId,
    payeeId,
    requirement.tokenId,
    amountBaseUnits,
    `x402 call #${callIndex}`,
    agentPrivateKey
  );

  // 4. Build X-PAYMENT proof header
  const proof = {
    scheme: "hedera-native",
    network: "testnet",
    transactionId: txId,
    payerAccountId: agentAccount,
    tokenId: requirement.tokenId,
    amountBaseUnits: requirement.amountBaseUnits,
  };
  const proofHeader = Buffer.from(JSON.stringify(proof)).toString("base64url");

  // 5. Retry request with payment proof
  let res2 = await fetch(targetUrl, {
    headers: {
      "X-PAYMENT": proofHeader,
    },
  });

  // Retry once with 1s delay if not 200 (handling mirror node ingestion delay)
  if (res2.status !== 200) {
    await new Promise((r) => setTimeout(r, 1200));
    res2 = await fetch(targetUrl, {
      headers: {
        "X-PAYMENT": proofHeader,
      },
    });
  }

  // Handle paid-but-failed with Refund fallback
  if (res2.status !== 200) {
    const errorText = await res2.text();
    await hcs.emit("PAYMENT_FAILED", {
      call: callIndex,
      txId,
      status: res2.status,
      error: errorText,
    });

    try {
      const refundRes = await fetch(`${merchantBaseUrl}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      });
      if (refundRes.ok) {
        const refundData = (await refundRes.json()) as Record<string, unknown>;
        await hcs.emit("REFUND_ISSUED", refundData);
      }
    } catch {
      // Non-blocking refund log
    }

    throw new Error(`Payment settled (${txId}) but request failed: ${res2.status} ${errorText}`);
  }

  const resData = (await res2.json()) as any;
  const usage: UsageReport = resData.usage;

  // 6. Emit PAYMENT_SETTLED and METERED_USAGE to HCS
  await hcs.emit("PAYMENT_SETTLED", {
    call: callIndex,
    txId,
    mirrorTxId: resData.settlement?.mirrorTxId || txId,
    amountFusdc: usage.totalFusdc,
    feeFusdc: 0.01,
  });

  await hcs.emit("METERED_USAGE", usage as unknown as Record<string, unknown>);

  const paymentRecord: PaymentRecord = {
    callIndex,
    symbol: queryParams.symbol || "HBAR",
    amountFusdc: usage.totalFusdc,
    feeFusdc: 0.01,
    txId,
    mirrorTxId: resData.settlement?.mirrorTxId || txId,
    status: "SETTLED",
    settledAt: new Date().toISOString(),
  };

  return {
    data: resData.data,
    usage,
    paymentRecord,
  };
}
