import { Router } from "express";
import { AccountId, PrivateKey } from "@hashgraph/sdk";
import type { AppConfig } from "@fatera/config";
import type { MirrorClient } from "@fatera/mirror";
import { HederaService } from "@fatera/hedera";
import type { HcsLogger } from "@fatera/hcs";
import type { ReplayStore } from "../verify/replayStore.js";

export function createRefundRouter(
  config: AppConfig,
  mirror: MirrorClient,
  hedera: HederaService,
  replayStore: ReplayStore,
  hcs: HcsLogger
): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const { transactionId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ error: "MISSING_TRANSACTION_ID" });
    }

    try {
      const tx = await mirror.waitForTransaction(transactionId, 10000);
      if (!tx || tx.result !== "SUCCESS") {
        return res.status(400).json({ error: "TRANSACTION_NOT_ELIGIBLE_FOR_REFUND" });
      }

      // Check transaction age (<10 min = 600s)
      const txConsensusSec = parseFloat(tx.consensus_timestamp);
      const nowSec = Date.now() / 1000;
      if (Math.abs(nowSec - txConsensusSec) > 600) {
        return res.status(400).json({ error: "REFUND_WINDOW_EXPIRED" });
      }

      // Find transfer to merchant
      const tokenTransfers = tx.token_transfers || [];
      const paymentTransfer = tokenTransfers.find(
        (t: any) =>
          t.token_id === config.fusdcTokenId &&
          t.account === config.merchantAccount &&
          t.amount > 0
      );

      if (!paymentTransfer) {
        return res.status(400).json({ error: "NO_PAYMENT_TO_MERCHANT_FOUND" });
      }

      // Find original payer
      const payerTransfer = tokenTransfers.find(
        (t: any) =>
          t.token_id === config.fusdcTokenId &&
          t.account !== config.merchantAccount &&
          t.account !== config.feeCollectorAccount &&
          t.amount < 0
      );

      if (!payerTransfer) {
        return res.status(400).json({ error: "COULD_NOT_IDENTIFY_PAYER" });
      }

      const refundAmountBase = paymentTransfer.amount;
      const refundPayerId = payerTransfer.account;

      // Transfer refund back using merchant's key
      const merchantKey = HederaService.parsePrivateKey(config.merchantKey);
      const refundResult = await hedera.transferFusdc(
        AccountId.fromString(config.merchantAccount),
        AccountId.fromString(refundPayerId),
        config.fusdcTokenId,
        refundAmountBase,
        `Refund for ${transactionId}`,
        merchantKey
      );

      // Invalidate replay store for this original tx so it cannot be claimed twice
      replayStore.add(`REFUNDED:${transactionId}`);

      // Emit HCS event
      await hcs.emit("REFUND_ISSUED", {
        originalTxId: transactionId,
        refundTxId: refundResult.txId,
        refundedTo: refundPayerId,
        amountBaseUnits: refundAmountBase,
        amountFusdc: refundAmountBase / 1_000_000,
      });

      return res.json({
        status: "refunded",
        originalTxId: transactionId,
        refundTxId: refundResult.txId,
        refundedTo: refundPayerId,
        amountFusdc: refundAmountBase / 1_000_000,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: "REFUND_FAILED",
        message: err.message,
      });
    }
  });

  return router;
}
