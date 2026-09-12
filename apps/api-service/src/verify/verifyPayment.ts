import { MirrorClient, toMirrorTxId } from "@fatera/mirror";
import type { X402PaymentProof, X402PaymentRequirement } from "@fatera/types";
import type { ReplayStore } from "./replayStore.js";

export interface VerificationResult {
  valid: boolean;
  txId: string;
  mirrorTxId: string;
  payerAccountId: string;
  payeeAccountId: string;
  amountBaseUnits: string;
  consensusTimestamp: string;
  feePaidBaseUnits?: number;
}

export class PaymentVerificationError extends Error {
  constructor(message: string, public code = "PAYMENT_VERIFICATION_FAILED") {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export async function verifyPayment(
  proof: X402PaymentProof,
  requirement: X402PaymentRequirement,
  mirror: MirrorClient,
  replayStore: ReplayStore,
  feeCollectorAccountId?: string
): Promise<VerificationResult> {
  const txId = proof.transactionId;
  if (!txId) {
    throw new PaymentVerificationError("Missing transactionId in payment proof", "INVALID_PROOF");
  }

  // 1. Replay check
  if (replayStore.has(txId)) {
    throw new PaymentVerificationError(
      `Transaction ${txId} has already been used (replay detected)`,
      "REPLAY_DETECTED"
    );
  }

  // 2. Fetch transaction from mirror node
  const tx = await mirror.waitForTransaction(txId, 20000);
  if (!tx) {
    throw new PaymentVerificationError(`Transaction ${txId} not found on mirror node`, "TX_NOT_FOUND");
  }

  // 3. Result status check
  if (tx.result !== "SUCCESS") {
    throw new PaymentVerificationError(
      `Transaction did not succeed on-chain: ${tx.result}`,
      "TX_FAILED"
    );
  }

  // 4. Freshness check
  const txConsensusSec = parseFloat(tx.consensus_timestamp);
  const nowSec = Date.now() / 1000;
  const age = Math.abs(nowSec - txConsensusSec);
  if (age > requirement.maxAgeSeconds) {
    throw new PaymentVerificationError(
      `Transaction is too old (${age.toFixed(0)}s > max ${requirement.maxAgeSeconds}s)`,
      "TX_EXPIRED"
    );
  }

  // 5. Transfer verification
  if (proof.scheme === "hedera-native") {
    const tokenTransfers = tx.token_transfers || [];
    const expectedTokenId = requirement.tokenId;
    const expectedPayee = requirement.payeeAccountId;
    const expectedAmount = Number(requirement.amountBaseUnits);

    // Verify credit to payee
    const credit = tokenTransfers.find(
      (t: any) =>
        t.token_id === expectedTokenId &&
        t.account === expectedPayee &&
        t.amount >= expectedAmount
    );
    if (!credit) {
      throw new PaymentVerificationError(
        `Payee ${expectedPayee} was not credited ${expectedAmount} of token ${expectedTokenId}`,
        "INSUFFICIENT_CREDIT"
      );
    }

    // Verify debit from claimed payer
    const debit = tokenTransfers.find(
      (t: any) =>
        t.token_id === expectedTokenId &&
        t.account === proof.payerAccountId &&
        t.amount < 0
    );
    if (!debit) {
      throw new PaymentVerificationError(
        `Claimed payer ${proof.payerAccountId} was not debited token ${expectedTokenId}`,
        "INVALID_PAYER"
      );
    }

    // Detect fee transfer to fee collector if present
    let feePaidBaseUnits = 0;
    if (feeCollectorAccountId) {
      const feeTransfer = tokenTransfers.find(
        (t: any) =>
          t.token_id === expectedTokenId &&
          t.account === feeCollectorAccountId &&
          t.amount > 0
      );
      if (feeTransfer) {
        feePaidBaseUnits = feeTransfer.amount;
      }
    }

    // Mark used in replay store
    replayStore.add(txId);

    return {
      valid: true,
      txId,
      mirrorTxId: toMirrorTxId(txId),
      payerAccountId: proof.payerAccountId,
      payeeAccountId: expectedPayee,
      amountBaseUnits: requirement.amountBaseUnits,
      consensusTimestamp: tx.consensus_timestamp,
      feePaidBaseUnits,
    };
  }

  throw new PaymentVerificationError(`Unsupported payment scheme: ${proof.scheme}`, "UNSUPPORTED_SCHEME");
}
