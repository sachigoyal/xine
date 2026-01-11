import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".wallet-cli");
const WALLETS_FILE = join(CONFIG_DIR, "wallets.json");

export interface StoredWallet {
  name: string;
  chain: "solana" | "ethereum";
  mnemonic: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadWallets(): StoredWallet[] {
  ensureConfigDir();
  if (!existsSync(WALLETS_FILE)) return [];
  return JSON.parse(readFileSync(WALLETS_FILE, "utf-8"));
}

export function saveWallet(wallet: StoredWallet) {
  ensureConfigDir();
  const wallets = loadWallets();
  wallets.push(wallet);
  writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
}

export function getStoragePath() {
  return WALLETS_FILE;
}

