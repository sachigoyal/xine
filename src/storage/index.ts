import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".xine");
const WALLETS_FILE = join(CONFIG_DIR, "wallets.json");

export type Chain = "solana" | "ethereum";

export interface DerivedWallet {
  index: number;
  chain: Chain;
  publicKey: string;
  privateKey: string;
  path: string;
  createdAt: string;
}

export interface MnemonicEntry {
  name: string;
  chain: Chain;
  createdAt: string;
  wallets: DerivedWallet[];
}

export interface WalletStore {
  [mnemonic: string]: MnemonicEntry;
}

export interface IWalletStorage {
  // Mnemonic CRUD
  getMnemonics(): string[];
  getMnemonicEntry(mnemonic: string): MnemonicEntry | undefined;
  addMnemonic(mnemonic: string, name: string, chain: Chain): void;
  deleteMnemonic(mnemonic: string): boolean;
  
  // Derived wallet CRUD
  getWallets(mnemonic: string): DerivedWallet[];
  addWallet(mnemonic: string, wallet: Omit<DerivedWallet, "createdAt">): void;
  deleteWallet(mnemonic: string, index: number): boolean;
  
  // Utils
  getStoragePath(): string;
  getAllEntries(): [string, MnemonicEntry][];
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

class WalletStorage implements IWalletStorage {
  private load(): WalletStore {
    ensureConfigDir();
    if (!existsSync(WALLETS_FILE)) return {};
    const data = readFileSync(WALLETS_FILE, "utf-8");
    return JSON.parse(data);
  }

  private save(store: WalletStore): void {
    ensureConfigDir();
    writeFileSync(WALLETS_FILE, JSON.stringify(store, null, 2));
  }

  getMnemonics(): string[] {
    return Object.keys(this.load());
  }

  getMnemonicEntry(mnemonic: string): MnemonicEntry | undefined {
    return this.load()[mnemonic];
  }

  addMnemonic(mnemonic: string, name: string, chain: Chain): void {
    const store = this.load();
    if (!store[mnemonic]) {
      store[mnemonic] = {
        name,
        chain,
        createdAt: new Date().toISOString(),
        wallets: [],
      };
      this.save(store);
    }
  }

  deleteMnemonic(mnemonic: string): boolean {
    const store = this.load();
    if (!store[mnemonic]) return false;
    delete store[mnemonic];
    this.save(store);
    return true;
  }

  getWallets(mnemonic: string): DerivedWallet[] {
    return this.load()[mnemonic]?.wallets ?? [];
  }

  addWallet(mnemonic: string, wallet: Omit<DerivedWallet, "createdAt">): void {
    const store = this.load();
    if (!store[mnemonic]) {
      throw new Error("Mnemonic not found. Add mnemonic first.");
    }
    store[mnemonic].wallets.push({
      ...wallet,
      createdAt: new Date().toISOString(),
    });
    this.save(store);
  }

  deleteWallet(mnemonic: string, index: number): boolean {
    const store = this.load();
    const entry = store[mnemonic];
    if (!entry) return false;
    
    const walletIdx = entry.wallets.findIndex(w => w.index === index);
    if (walletIdx === -1) return false;
    
    entry.wallets.splice(walletIdx, 1);
    this.save(store);
    return true;
  }

  getStoragePath(): string {
    return WALLETS_FILE;
  }

  getAllEntries(): [string, MnemonicEntry][] {
    return Object.entries(this.load());
  }
}

// Export singleton instance
export const storage = new WalletStorage();

// Legacy exports for backward compat (deprecated)
export function getStoragePath() {
  return storage.getStoragePath();
}
