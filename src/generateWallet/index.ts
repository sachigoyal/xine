import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { generateTable, pubpritable } from "../table";
import bs58 from "bs58";
import { ethers } from "ethers";

export type Chain = "solana" | "ethereum";

export function generateWallet(chain: Chain, index: number) {
  const mnemonic = generateMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);

  if (chain === "solana") {
    const path = `m/44'/501'/${index}'/0'`;
    const { key } = derivePath(path, seed.toString("hex"));
    const keypair = Keypair.fromSeed(key);

    const publicKey = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);

    return {
      mnemonic,
      table: generateTable(mnemonic),
      keypairTable: pubpritable(publicKey, privateKey),
      publicKey,
      privateKey,
      secretKey: keypair.secretKey,
    };
  }
  if (chain === "ethereum") {
    const path = `m/44'/60'/${index}'/0/0`;
    const hdNode = ethers.HDNodeWallet.fromSeed(seed).derivePath(path);

    const publicKey = hdNode.address;
    const privateKey = hdNode.privateKey;

    return {
      mnemonic,
      table: generateTable(mnemonic),
      keypairTable: pubpritable(publicKey, privateKey),
      publicKey,
      privateKey,
    };
  }
}

export function addWallet(chain: Chain, mnemonic: string, index: number) {
  const seed = mnemonicToSeedSync(mnemonic);

  if (chain === "solana") {
    const path = `m/44'/501'/${index}'/0'`;
    const { key } = derivePath(path, seed.toString("hex"));
    const keypair = Keypair.fromSeed(key);

    const publicKey = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);

    return {
      keypairTable: pubpritable(publicKey, privateKey),
      publicKey,
      privateKey,
      secretKey: keypair.secretKey,
      path,
    };
  }
  if (chain === "ethereum") {
    const path = `m/44'/60'/${index}'/0/0`;
    const hdNode = ethers.HDNodeWallet.fromSeed(seed).derivePath(path);

    return {
      keypairTable: pubpritable(hdNode.address, hdNode.privateKey),
      publicKey: hdNode.address,
      privateKey: hdNode.privateKey,
      path,
    };
  }
}
