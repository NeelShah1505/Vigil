import { Router } from "express";
import { FIELDS, type Field } from "@fatera/types";
import { priceCall } from "../pricing.js";
import type { AppConfig } from "@fatera/config";

export function createPriceRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const fieldsParam = (req.query.fields as string) || "price,volume,sentiment,volatility,trend";
    const rawFields = fieldsParam.split(",").map((f) => f.trim().toLowerCase());
    const validFields: Field[] = rawFields.filter((f): f is Field => FIELDS.includes(f as Field));

    const baseFee = config.BASE_FEE_FUSDC;
    const perFieldFee = config.PER_FIELD_FUSDC;
    const totalFusdc = priceCall(validFields, baseFee, perFieldFee);

    return res.json({
      asset: "FUSDC",
      baseFeeFusdc: baseFee,
      perFieldFusdc: perFieldFee,
      fieldsCount: validFields.length,
      fields: validFields,
      totalFusdc,
      amountBaseUnits: Math.round(totalFusdc * 1_000_000).toString(),
      tokenId: config.fusdcTokenId,
      payeeAccountId: config.merchantAccount,
    });
  });

  return router;
}
