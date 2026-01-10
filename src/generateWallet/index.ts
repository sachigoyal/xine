import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { generateTable, pubpritable } from "../table";
import bs58 from "bs58";

export function generateWallet(index: number) {
    const mnemonic = generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
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
        secretKey: keypair.secretKey,
    };
}

export function addWallet(mnemonic: string, index: number) {
    const seed = mnemonicToSeedSync(mnemonic);
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