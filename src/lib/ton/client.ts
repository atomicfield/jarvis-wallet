import "server-only";

import { fromNano } from "@ton/ton";

import { requireEnv } from "@/lib/server/env";

function tonApiHeaders() {
  const apiKey = requireEnv("TONAPI_KEY");
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

/**
 * Get balance of a TON wallet address in nanotons (raw).
 */
export async function getBalance(address: string): Promise<bigint> {
  const response = await fetch(
    `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}`,
    { headers: tonApiHeaders(), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`TonAPI account request failed: ${response.status}`);
  const data = await response.json() as { balance?: number | string };
  return BigInt(data.balance ?? 0);
}

/**
 * Get balance formatted as a human-readable string.
 */
export async function getBalanceFormatted(address: string): Promise<string> {
  const balance = await getBalance(address);
  return fromNano(balance);
}

/**
 * Get jetton balances for an address via TonAPI.
 * Returns a simplified list of token balances.
 */
export async function getJettonBalances(
  address: string,
): Promise<
  Array<{
    symbol: string;
    name: string;
    balance: string;
    jettonAddress: string;
  }>
> {
  const response = await fetch(
    `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/jettons`,
    { headers: tonApiHeaders(), cache: "no-store" },
  );

  if (!response.ok) {
    console.error("TonAPI jetton query failed:", response.status);
    return [];
  }

  const data = (await response.json()) as {
    balances?: Array<{
      balance: string;
      jetton: {
        address: string;
        name: string;
        symbol: string;
        decimals: number;
      };
    }>;
  };

  return (data.balances ?? []).map((item) => ({
    symbol: item.jetton.symbol,
    name: item.jetton.name,
    balance: item.balance,
    jettonAddress: item.jetton.address,
  }));
}
