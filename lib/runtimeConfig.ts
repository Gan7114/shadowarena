type ImpostersConfig = {
  rpcUrl: string;
  gameAddress: string;
  marketAddress: string;
};

type ShadowConfig = {
  rpcUrl: string;
  protocolAddress: string;
  marketAddress: string;
};

export const IMPOSTERS_CONFIG_KEY = "shadow-arena:imposters-config";
export const SHADOW_CONFIG_KEY = "shadow-arena:shadow-config";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadImpostersConfig(fallback: ImpostersConfig): ImpostersConfig {
  return readJson<ImpostersConfig>(IMPOSTERS_CONFIG_KEY) ?? fallback;
}

export function loadShadowConfig(fallback: ShadowConfig): ShadowConfig {
  return readJson<ShadowConfig>(SHADOW_CONFIG_KEY) ?? fallback;
}

export function saveImpostersConfig(config: ImpostersConfig): void {
  writeJson(IMPOSTERS_CONFIG_KEY, config);
}

export function saveShadowConfig(config: ShadowConfig): void {
  writeJson(SHADOW_CONFIG_KEY, config);
}
