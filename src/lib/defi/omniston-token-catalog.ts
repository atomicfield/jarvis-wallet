import "server-only";

import { StonApiClient } from "@ston-fi/api";

import { KNOWN_TOKENS } from "@/lib/defi/tokens";

const DEFAULT_STON_API_URL = "https://api.ston.fi";
const TOKEN_CATALOG_TTL_MS = 5 * 60 * 1000;

export interface SwapTokenCatalogItem {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  imageUrl: string | null;
}

export interface SwapTokenCatalog {
  tokens: SwapTokenCatalogItem[];
  bySymbol: Map<string, SwapTokenCatalogItem>;
  byAddress: Map<string, SwapTokenCatalogItem>;
}

interface CachedCatalog extends SwapTokenCatalog {
  expiresAt: number;
}

interface CandidateToken extends SwapTokenCatalogItem {
  score: number;
}

const stonApiClient = new StonApiClient({
  baseURL: process.env.STON_API_URL?.trim() || DEFAULT_STON_API_URL,
});

let cachedCatalog: CachedCatalog | null = null;

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function scoreAsset(asset: Awaited<ReturnType<StonApiClient["getAssets"]>>[number]) {
  const popularityScore = typeof asset.popularityIndex === "number" ? asset.popularityIndex : 0;
  const priorityScore = typeof asset.priority === "number" ? asset.priority : 0;
  return popularityScore * 100 + priorityScore;
}

function createFallbackCatalog(): SwapTokenCatalog {
  const fallbackTokens = KNOWN_TOKENS.map<SwapTokenCatalogItem>((token) => ({
    symbol: token.symbol.toUpperCase(),
    name: token.name,
    address: token.address,
    decimals: token.decimals,
    imageUrl: null,
  }));

  return buildCatalogFromCandidates(
    fallbackTokens.map((token, index) => ({ ...token, score: 50 - index })),
  );
}

function buildCatalogFromCandidates(candidates: CandidateToken[]): SwapTokenCatalog {
  const byAddressCandidates = new Map<string, CandidateToken>();

  for (const token of candidates) {
    const key = normalizeAddress(token.address);
    const existing = byAddressCandidates.get(key);
    if (!existing || token.score > existing.score) {
      byAddressCandidates.set(key, token);
    }
  }

  const byAddress = new Map<string, SwapTokenCatalogItem>();
  for (const [key, value] of byAddressCandidates.entries()) {
    byAddress.set(key, {
      symbol: value.symbol,
      name: value.name,
      address: value.address,
      decimals: value.decimals,
      imageUrl: value.imageUrl,
    });
  }

  const bySymbolCandidates = new Map<string, CandidateToken>();
  for (const token of byAddressCandidates.values()) {
    const existing = bySymbolCandidates.get(token.symbol);
    if (!existing || token.score > existing.score) {
      bySymbolCandidates.set(token.symbol, token);
    }
  }

  for (const knownToken of KNOWN_TOKENS) {
    const symbol = knownToken.symbol.toUpperCase();
    if (!bySymbolCandidates.has(symbol)) {
      bySymbolCandidates.set(symbol, {
        symbol,
        name: knownToken.name,
        address: knownToken.address,
        decimals: knownToken.decimals,
        imageUrl: null,
        score: 1,
      });
    }
    const addressKey = normalizeAddress(knownToken.address);
    if (!byAddress.has(addressKey)) {
      byAddress.set(addressKey, {
        symbol,
        name: knownToken.name,
        address: knownToken.address,
        decimals: knownToken.decimals,
        imageUrl: null,
      });
    }
  }

  const bySymbol = new Map<string, SwapTokenCatalogItem>();
  for (const [symbol, token] of bySymbolCandidates.entries()) {
    bySymbol.set(symbol, {
      symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      imageUrl: token.imageUrl,
    });
  }

  const tokens = Array.from(bySymbolCandidates.values())
    .sort((a, b) => {
      if (a.symbol === "TON") return -1;
      if (b.symbol === "TON") return 1;
      if (a.score !== b.score) return b.score - a.score;
      return a.symbol.localeCompare(b.symbol);
    })
    .map<SwapTokenCatalogItem>((token) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      imageUrl: token.imageUrl,
    }));

  return {
    tokens,
    bySymbol,
    byAddress,
  };
}

async function fetchFreshCatalog(): Promise<SwapTokenCatalog> {
  const [assets, pairs] = await Promise.all([
    stonApiClient.getAssets(),
    stonApiClient.getSwapPairs(),
  ]);
  const pairAddressSet = new Set(
    pairs.flatMap(([offerAddress, askAddress]) => [
      normalizeAddress(offerAddress),
      normalizeAddress(askAddress),
    ]),
  );

  const candidates: CandidateToken[] = [];

  for (const asset of assets) {
    const symbol = asset.symbol?.trim().toUpperCase();
    const address = asset.contractAddress?.trim();
    if (!symbol || !address || !Number.isFinite(asset.decimals)) {
      continue;
    }

    if (pairAddressSet.size > 0 && !pairAddressSet.has(normalizeAddress(address))) {
      continue;
    }

    candidates.push({
      symbol,
      name: asset.displayName?.trim() || symbol,
      address,
      decimals: asset.decimals,
      imageUrl: asset.imageUrl ?? null,
      score: scoreAsset(asset),
    });
  }

  return buildCatalogFromCandidates(candidates);
}

export async function getSwapTokenCatalog(forceRefresh = false): Promise<SwapTokenCatalog> {
  const now = Date.now();
  if (!forceRefresh && cachedCatalog && cachedCatalog.expiresAt > now) {
    return cachedCatalog;
  }

  try {
    const freshCatalog = await fetchFreshCatalog();
    cachedCatalog = {
      ...freshCatalog,
      expiresAt: now + TOKEN_CATALOG_TTL_MS,
    };
    return freshCatalog;
  } catch (error) {
    console.error("[SwapTokens] Failed to refresh STON token catalog:", error);
    if (cachedCatalog) {
      return cachedCatalog;
    }
    return createFallbackCatalog();
  }
}
