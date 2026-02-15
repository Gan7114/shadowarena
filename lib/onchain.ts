import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  ZeroAddress,
  formatEther,
  isAddress,
  keccak256,
  parseEther,
  toUtf8Bytes,
} from "ethers";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
      selectedAddress?: string;
    };
  }
}

export const ZERO_ADDRESS = ZeroAddress;
export const MONAD_MAINNET_CHAIN_ID = 143;
export const MONAD_MAINNET_CHAIN_HEX = "0x8f";

const MONAD_MAINNET_PARAMS = {
  chainId: MONAD_MAINNET_CHAIN_HEX,
  chainName: "Monad Mainnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.monad.xyz"],
  blockExplorerUrls: ["https://monadscan.com"],
};

const readClients = new Map<string, JsonRpcProvider>();

export function getReadProvider(rpcUrl: string): JsonRpcProvider {
  const cached = readClients.get(rpcUrl);
  if (cached) return cached;
  const next = new JsonRpcProvider(rpcUrl);
  readClients.set(rpcUrl, next);
  return next;
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<string> {
  if (!hasWallet()) {
    throw new Error("No wallet detected. Install MetaMask or another EVM wallet.");
  }
  const provider = new BrowserProvider(window.ethereum!);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return signer.address;
}

export async function getWalletChainId(): Promise<number> {
  if (!hasWallet()) {
    throw new Error("No wallet detected.");
  }

  const provider = new BrowserProvider(window.ethereum!);
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export async function ensureMonadMainnet(): Promise<void> {
  if (!hasWallet()) {
    throw new Error("No wallet detected. Install MetaMask or another EVM wallet.");
  }

  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_MAINNET_CHAIN_HEX }],
    });
    return;
  } catch (error: any) {
    const code = Number(error?.code);
    const message = String(error?.message || "").toLowerCase();
    const missingChain = code === 4902 || message.includes("unrecognized chain");

    if (!missingChain) {
      throw error;
    }
  }

  await window.ethereum!.request({
    method: "wallet_addEthereumChain",
    params: [MONAD_MAINNET_PARAMS],
  });
}

export async function getWalletContracts<T extends Record<string, { address: string; abi: readonly string[] }>>(
  defs: T
): Promise<{ signerAddress: string; contracts: { [K in keyof T]: Contract } }> {
  if (!hasWallet()) {
    throw new Error("No wallet detected.");
  }

  const provider = new BrowserProvider(window.ethereum!);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  const contracts: Partial<{ [K in keyof T]: Contract }> = {};
  for (const [key, value] of Object.entries(defs)) {
    contracts[key as keyof T] = new Contract(value.address, value.abi, signer);
  }

  return {
    signerAddress,
    contracts: contracts as { [K in keyof T]: Contract },
  };
}

export function createReadContract(address: string, abi: readonly string[], rpcUrl: string): Contract {
  return new Contract(address, abi, getReadProvider(rpcUrl));
}

export function formatMon(value: bigint | number | string): string {
  try {
    return Number(formatEther(value)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export function parseMon(value: string): bigint {
  return parseEther(value || "0");
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function normalizeNumberish(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

export function safeAddress(value: string): string {
  if (!value) return ZERO_ADDRESS;
  return isAddress(value) ? value : ZERO_ADDRESS;
}

export function hashStatement(text: string): string {
  return keccak256(toUtf8Bytes(text));
}

export function bytes32(value: string): string {
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return value;
  throw new Error("Expected bytes32 hex string");
}

export function parseCsvList(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
