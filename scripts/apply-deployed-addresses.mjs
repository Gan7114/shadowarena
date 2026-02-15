#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function usageAndExit() {
  console.error(`Usage:
  npm run apply:addresses -- \\
    --rpc https://rpc.monad.xyz \\
    --shadow-protocol 0x... \\
    --shadow-market 0x... \\
    --imposters-game 0x... \\
    --imposters-market 0x...
`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) continue;
    out[key.slice(2)] = value;
    i += 1;
  }
  return out;
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function upsertEnvValue(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escapedKey}\\s*=.*$`, "m");
  const line = `${key}=${value}`;
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const trimmed = content.trimEnd();
  return `${trimmed}${trimmed.length > 0 ? "\n" : ""}${line}\n`;
}

function writeEnvFile(targetPath, updates) {
  const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  let next = existing;
  for (const [key, value] of Object.entries(updates)) {
    next = upsertEnvValue(next, key, value);
  }
  fs.writeFileSync(targetPath, next, "utf8");
}

function main() {
  const args = parseArgs(process.argv);
  const rpc = args.rpc || "https://rpc.monad.xyz";
  const shadowProtocol = args["shadow-protocol"];
  const shadowMarket = args["shadow-market"];
  const impostersGame = args["imposters-game"];
  const impostersMarket = args["imposters-market"];

  if (!isAddress(shadowProtocol) || !isAddress(shadowMarket) || !isAddress(impostersGame) || !isAddress(impostersMarket)) {
    console.error("Invalid or missing one/more contract addresses.");
    usageAndExit();
  }

  const arenaRoot = process.cwd();
  const monadRoot = path.resolve(arenaRoot, "..");

  const shadowProtocolEnv = path.join(monadRoot, "shadow-protocol", ".env");
  const amongUsEnv = path.join(monadRoot, "among-us-5", ".env");
  const arenaEnv = path.join(arenaRoot, ".env.local");

  writeEnvFile(shadowProtocolEnv, {
    MONAD_RPC_URL: rpc,
    CONTRACT_ADDRESS: shadowProtocol,
    MARKET_CONTRACT_ADDRESS: shadowMarket,
  });

  writeEnvFile(amongUsEnv, {
    MONAD_RPC: rpc,
    GAME_CONTRACT: impostersGame,
    PREDICTION_MARKET: impostersMarket,
  });

  writeEnvFile(arenaEnv, {
    VITE_SHADOW_RPC_URL: rpc,
    VITE_SHADOW_PROTOCOL_ADDRESS: shadowProtocol,
    VITE_SHADOW_MARKET_ADDRESS: shadowMarket,
    VITE_IMPOSTERS_RPC_URL: rpc,
    VITE_IMPOSTERS_GAME_ADDRESS: impostersGame,
    VITE_IMPOSTERS_MARKET_ADDRESS: impostersMarket,
  });

  console.log("Updated files:");
  console.log(`- ${shadowProtocolEnv}`);
  console.log(`- ${amongUsEnv}`);
  console.log(`- ${arenaEnv}`);
}

main();
