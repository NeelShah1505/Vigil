import { Router } from "express";
import crypto from "node:crypto";
import { FIELDS, type Field, type UsageReport, type X402PaymentProof, type X402PaymentRequirement } from "@vigil/types";
import { priceCall } from "../pricing.js";
import { generateMarketData } from "../data.js";
import { verifyPayment, PaymentVerificationError } from "../verify/verifyPayment.js";
import type { MirrorClient } from "@vigil/mirror";
import type { ReplayStore } from "../verify/replayStore.js";
import type { HcsLogger } from "@vigil/hcs";
import type { AppConfig } from "@vigil/config";

export function createMarketDataRouter(
  config: AppConfig,
  mirror: MirrorClient,
  replayStore: ReplayStore,
  hcs: HcsLogger
): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const symbol = (req.query.symbol as string) || "HBAR";
    const fieldsParam = (req.query.fields as string) || "price,volume,sentiment,volatility,trend";
    const rawFields = fieldsParam.split(",").map((f) => f.trim().toLowerCase());
    const validFields: Field[] = rawFields.filter((f): f is Field => FIELDS.includes(f as Field));

    if (validFields.length === 0) {
      return res.status(400).json({
        error: "INVALID_FIELDS",
        message: `Allowed fields: ${FIELDS.join(", ")}`,
      });
    }

    const baseFee = config.BASE_FEE_FUSDC;
    const perFieldFee = config.PER_FIELD_FUSDC;
    const totalFusdc = priceCall(validFields, baseFee, perFieldFee);
    const amountBaseUnits = Math.round(totalFusdc * 1_000_000).toString();
    const sessionId = crypto.randomUUID();

    const paymentRequirement: X402PaymentRequirement = {
      scheme: "hedera-native",
      network: config.network,
      asset: "FUSDC",
      tokenId: config.fusdcTokenId,
      amountBaseUnits,
      payeeAccountId: config.merchantAccount,
      resource: "/market-data",
      maxAgeSeconds: 300,
      sessionId,
      description: `Metered market data: base ${baseFee.toFixed(2)} + ${perFieldFee.toFixed(2)}/field × ${validFields.length} fields = ${totalFusdc.toFixed(2)} FUSDC`,
    };

    const paymentHeader = (req.headers["x-payment"] || req.headers["X-PAYMENT"]) as string | undefined;

    // Step 1: No payment header -> return 402 with exact requirements
    if (!paymentHeader) {
      return res.status(402).json({
        error: "X402_PAYMENT_REQUIRED",
        x402: {
          version: 1,
          mode: config.X402_MODE === "OFFICIAL" ? "official-blocky402" : "native-hedera",
        },
        paymentRequirements: [paymentRequirement],
        usagePreview: {
          baseFeeFusdc: baseFee,
          perFieldFusdc: perFieldFee,
          fields: validFields.length,
          totalFusdc,
        },
      });
    }

    // Step 2: Payment header present -> verify and fulfill
    try {
      let decodedStr = "";
      try {
        decodedStr = Buffer.from(paymentHeader, "base64url").toString("utf8");
      } catch {
        decodedStr = Buffer.from(paymentHeader, "base64").toString("utf8");
      }

      const proof = JSON.parse(decodedStr) as X402PaymentProof;
      const verification = await verifyPayment(
        proof,
        paymentRequirement,
        mirror,
        replayStore,
        config.feeCollectorAccount
      );

      // Generate data and usage report
      const data = generateMarketData(symbol, validFields);
      const usage: UsageReport = {
        sessionId,
        symbol: symbol.toUpperCase(),
        fields: validFields,
        baseFeeFusdc: baseFee,
        perFieldFusdc: perFieldFee,
        fieldsCount: validFields.length,
        totalFusdc,
        timestamp: new Date().toISOString(),
      };

      // Emit HCS events
      await hcs.emit("PAYMENT_SETTLED", {
        txId: verification.txId,
        mirrorTxId: verification.mirrorTxId,
        payer: verification.payerAccountId,
        payee: verification.payeeAccountId,
        amountFusdc: totalFusdc,
        feePaidBaseUnits: verification.feePaidBaseUnits || 0,
        consensusTimestamp: verification.consensusTimestamp,
      });

      await hcs.emit("METERED_USAGE", {
        sessionId,
        symbol: usage.symbol,
        fieldsCount: usage.fieldsCount,
        totalFusdc: usage.totalFusdc,
      });

      return res.status(200).json({
        status: "success",
        symbol: symbol.toUpperCase(),
        data,
        usage,
        settlement: {
          txId: verification.txId,
          mirrorTxId: verification.mirrorTxId,
          consensusTimestamp: verification.consensusTimestamp,
        },
      });
    } catch (err: any) {
      if (err instanceof PaymentVerificationError) {
        return res.status(402).json({
          error: err.code,
          message: err.message,
          paymentRequirements: [paymentRequirement],
        });
      }
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: err.message || "Failed to process payment verification",
      });
    }
  });

  return router;
}
