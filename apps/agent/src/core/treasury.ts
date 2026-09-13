import type { MirrorClient } from "@vigil/mirror";
import type { Balance } from "@vigil/types";

export interface TreasuryBalances {
  hbarTinybars: string;
  fusdcBaseUnits: string;
  hbarBalance: number;
  fusdcBalance: number;
}

export interface TreasuryPolicy {
  maxPerCallFusdc: number;
  maxSessionFusdc: number;
  maxHbarPerSwap: number;
}

export const DEFAULT_POLICY: TreasuryPolicy = {
  maxPerCallFusdc: 2.0,
  maxSessionFusdc: 25.0,
  maxHbarPerSwap: 50.0,
};

export class TreasuryService {
  constructor(
    private mirror: MirrorClient,
    private agentAccount: string,
    private fusdcTokenId: string,
    private policy: TreasuryPolicy = DEFAULT_POLICY
  ) {}

  async getBalances(): Promise<TreasuryBalances> {
    const hbarTinybars = await this.mirror.getAccountHbarTinybars(this.agentAccount);
    const fusdcBaseUnits = await this.mirror.getAccountTokenBalance(this.agentAccount, this.fusdcTokenId);

    const hbarBalance = Number(hbarTinybars) / 100_000_000;
    const fusdcBalance = Number(fusdcBaseUnits) / 1_000_000;

    return {
      hbarTinybars,
      fusdcBaseUnits,
      hbarBalance,
      fusdcBalance,
    };
  }

  toBalance(balances: TreasuryBalances): Balance {
    return {
      hbarTinybars: balances.hbarTinybars,
      fusdcBaseUnits: balances.fusdcBaseUnits,
    };
  }

  getPolicy(): TreasuryPolicy {
    return { ...this.policy };
  }

  validatePolicy(params: {
    quoteHbar?: number;
    costPerCallFusdc?: number;
    totalSessionFusdc?: number;
  }): { pass: boolean; reason?: string } {
    if (params.costPerCallFusdc !== undefined && params.costPerCallFusdc > this.policy.maxPerCallFusdc) {
      return {
        pass: false,
        reason: `Cost per call (${params.costPerCallFusdc} FUSDC) exceeds policy maximum (${this.policy.maxPerCallFusdc} FUSDC)`,
      };
    }

    if (params.totalSessionFusdc !== undefined && params.totalSessionFusdc > this.policy.maxSessionFusdc) {
      return {
        pass: false,
        reason: `Total session commitment (${params.totalSessionFusdc} FUSDC) exceeds policy limit (${this.policy.maxSessionFusdc} FUSDC)`,
      };
    }

    if (params.quoteHbar !== undefined && params.quoteHbar > this.policy.maxHbarPerSwap) {
      return {
        pass: false,
        reason: `Swap cost (${params.quoteHbar} HBAR) exceeds policy maximum per swap (${this.policy.maxHbarPerSwap} HBAR)`,
      };
    }

    return { pass: true };
  }
}
