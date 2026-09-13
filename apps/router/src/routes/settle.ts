import { Router } from "express";
import { AccountId } from "@hashgraph/sdk";
import type { AppConfig } from "@vigil/config";
import type { MirrorClient } from "@vigil/mirror";
import { HederaService } from "@vigil/hedera";
import type { HcsLogger } from "@vigil/hcs";
import type { RouterReplayStore } from "../verify/routerReplayStore.js";

export function createSettleRouter(
  config: AppConfig,
  mirror: MirrorClient,
  hedera: HederaService,
  replayStore: RouterReplayStore,
  hcs: HcsLogger
): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const { transactionId, payerAccountId, amountFusdc } = req.body || {};

    if (!transactionId || !payerAccountId || amountFusdc === undefined) {
      return res.status(400).json({
        error: "INVALID_BODY",
        message: "transactionId, payerAccountId, and amountFusdc are required",
      });
    }

    const fusdcAmount = parseFloat(amountFusdc);
    if (isNaN(fusdcAmount) || fusdcAmount <= 0) {
      return res.status(400).json({
        error: "INVALID_AMOUNT",
        message: "amountFusdc must be greater than 0",
      });
    }

    // 1. Replay check
    if (replayStore.has(transactionId)) {
      return res.status(400).json({
        error: "REPLAY_DETECTED",
        message: `Transaction ${transactionId} has already been settled`,
      });
    }

    try {
      // 2. Wait for mirror node to ingest HBAR transaction
      const tx = await mirror.waitForTransaction(transactionId, 20000);
      if (!tx || tx.result !== "SUCCESS") {
        return res.status(400).json({
          error: "TX_NOT_SUCCESSFUL",
          message: `HBAR transaction was not successful: ${tx?.result || "not found"}`,
        });
      }

      // 3. Freshness check
      const txConsensusSec = parseFloat(tx.consensus_timestamp);
      const nowSec = Date.now() / 1000;
      const age = Math.abs(nowSec - txConsensusSec);
      if (age > 120) {
        return res.status(400).json({
          error: "TX_EXPIRED",
          message: `Transaction is too old (${age.toFixed(0)}s > 120s)`,
        });
      }

      // 4. Verify HBAR transfer: Credit to router LP, debit from payer
      const transfers = tx.transfers || [];
      const rate = config.HBAR_PER_FUSDC;
      const feeBps = config.ROUTER_FEE_BPS;
      const expectedHbar = fusdcAmount * rate * (1 + feeBps / 10000);
      const minExpectedTinybars = Math.round(expectedHbar * 100_000_000);

      const lpCredit = transfers.find(
        (t: any) => t.account === config.routerLpAccount && Number(t.amount) >= minExpectedTinybars
      );
      if (!lpCredit) {
        return res.status(400).json({
          error: "INSUFFICIENT_HBAR_PAYMENT",
          message: `Expected at least ${minExpectedTinybars} tinybars to ROUTER_LP (${config.routerLpAccount})`,
        });
      }

      const payerDebit = transfers.find(
        (t: any) => t.account === payerAccountId && t.amount < 0
      );
      if (!payerDebit) {
        return res.status(400).json({
          error: "INVALID_PAYER",
          message: `Claimed payer ${payerAccountId} was not debited in transaction`,
        });
      }

      // 4. Settle second leg: Transfer FUSDC from ROUTER_LP to payer
      const amountBaseUnits = Math.round(fusdcAmount * 1_000_000);
      const routerLpKey = HederaService.parsePrivateKey(config.routerLpKey);

      const fusdcTransfer = await hedera.transferFusdc(
        AccountId.fromString(config.routerLpAccount),
        AccountId.fromString(payerAccountId),
        config.fusdcTokenId,
        amountBaseUnits,
        `VigilRouter swap fulfillment for ${transactionId}`,
        routerLpKey
      );

      // 5. Mark used in replay store
      replayStore.add(transactionId);

      // 6. Emit SWAP_SETTLED to HCS
      await hcs.emit("SWAP_SETTLED", {
        hbarTxId: transactionId,
        fusdcTxId: fusdcTransfer.txId,
        payer: payerAccountId,
        amountFusdc: fusdcAmount,
        hbarSpentTinybars: lpCredit.amount,
        hbarSpent: Number(lpCredit.amount) / 100_000_000,
        rate,
        feeBps,
      });

      return res.json({
        status: "settled",
        hbarTxId: transactionId,
        fusdcTxId: fusdcTransfer.txId,
        amountFusdc: fusdcAmount,
        hbarSpent: Number(lpCredit.amount) / 100_000_000,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: "SWAP_SETTLEMENT_FAILED",
        message: err.message,
      });
    }
  });

  return router;
}
