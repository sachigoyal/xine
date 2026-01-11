#!/usr/bin/env node

import { Command } from "commander";
import { intro, outro, select, isCancel, text, confirm } from "@clack/prompts";
import clipboard from "clipboardy";
import { generateWallet, addWallet, type Chain } from "./generateWallet";
import { storage } from "./storage";

const program = new Command();

program
  .name("wallet-cli")
  .description("🪙 A CLI tool for generating and managing crypto wallets")
  .version("1.0.0");

async function selectChain(): Promise<Chain> {
  const chain = await select({
    message: "Select chain:",
    options: [
      { value: "solana", label: "◎ Solana" },
      { value: "ethereum", label: "⟠ Ethereum" },
    ],
  });

  if (isCancel(chain)) {
    outro("Goodbye 👋");
    process.exit(0);
  }

  return chain as Chain;
}

program
  .command("generate")
  .alias("g")
  .description("Generate a new wallet with a fresh mnemonic")
  .option("-c, --chain <chain>", "Chain to use (solana or ethereum)")
  .action(async (opts) => {
    intro("🪙 Generate Wallet");

    const chain: Chain = opts.chain || (await selectChain());

    const wallet = generateWallet(chain, 0)!;
    console.log(wallet.table);

    const copyAction = await select({
      message: "Action",
      options: [
        { value: "copy", label: "📋 Copy Mnemonic" },
        { value: "continue", label: "Continue" },
      ],
    });

    if (copyAction === "copy") {
      await clipboard.write(wallet.mnemonic);
      console.log("✓ Copied to clipboard!");
    }

    console.log(wallet.keypairTable);

    const shouldStore = await confirm({
      message: "Store this wallet locally?",
    });

    if (!isCancel(shouldStore) && shouldStore) {
      const walletName = await text({
        message: "Enter a name for this wallet:",
        placeholder: "my-wallet",
        defaultValue: `${chain}-wallet`,
      });

      if (!isCancel(walletName)) {
        storage.addMnemonic(wallet.mnemonic, walletName, chain);
        storage.addWallet(wallet.mnemonic, {
          index: 0,
          chain,
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey,
          path: chain === "solana" ? "m/44'/501'/0'/0'" : "m/44'/60'/0'/0/0",
        });
        console.log(`✓ Saved to ${storage.getStoragePath()}`);
      }
    }

    let index = 1;
    while (true) {
      const more = await select({
        message: "Generate another wallet from same seed?",
        options: [
          { value: "yes", label: "Yes, derive next wallet" },
          { value: "no", label: "No, I'm done" },
        ],
      });

      if (isCancel(more) || more === "no") break;

      const derived = addWallet(chain, wallet.mnemonic, index)!;
      console.log(`\nWallet ${index}:`);
      console.log(derived.keypairTable);

      if (storage.getMnemonicEntry(wallet.mnemonic)) {
        storage.addWallet(wallet.mnemonic, {
          index,
          chain,
          publicKey: derived.publicKey,
          privateKey: derived.privateKey,
          path: derived.path,
        });
        console.log("✓ Added to stored wallets");
      }

      index++;
    }

    outro("Wallet generated! 🎉");
  });

program
  .command("import")
  .alias("i")
  .description("Import a wallet from an existing mnemonic")
  .action(async () => {
    intro("🪙 Import Wallet");

    const mnemonic = await text({
      message: "Enter your 12-word mnemonic phrase:",
      placeholder: "word1 word2 word3 ...",
      validate: (value) => {
        const words = value.trim().split(/\s+/);
        if (words.length !== 12) return "Mnemonic must be 12 words";
      },
    });

    if (isCancel(mnemonic)) {
      outro("Goodbye 👋");
      process.exit(0);
    }

    console.log("\n◎ Solana Wallets:\n");
    for (let i = 0; i < 5; i++) {
      const w = addWallet("solana", mnemonic, i)!;
      console.log(`  ${i}: ${w.publicKey}`);
    }

    console.log("\n⟠ Ethereum Wallets:\n");
    for (let i = 0; i < 5; i++) {
      const w = addWallet("ethereum", mnemonic, i)!;
      console.log(`  ${i}: ${w.publicKey}`);
    }

    const shouldStore = await confirm({
      message: "Store this mnemonic?",
    });

    if (!isCancel(shouldStore) && shouldStore) {
      const chain = await selectChain();
      const walletName = await text({
        message: "Enter a name:",
        placeholder: "imported-wallet",
        defaultValue: "imported-wallet",
      });

      if (!isCancel(walletName)) {
        storage.addMnemonic(mnemonic, walletName, chain);
        for (let i = 0; i < 5; i++) {
          const w = addWallet(chain, mnemonic, i)!;
          storage.addWallet(mnemonic, {
            index: i,
            chain,
            publicKey: w.publicKey,
            privateKey: w.privateKey,
            path: w.path,
          });
        }
        console.log(`✓ Saved to ${storage.getStoragePath()}`);
      }
    }

    outro("Import complete! 🎉");
  });

program
  .command("list")
  .alias("ls")
  .description("List all stored wallets")
  .option("-s, --secrets", "Show mnemonics and private keys")
  .action((opts) => {
    const entries = storage.getAllEntries();

    if (entries.length === 0) {
      console.log(
        "No wallets stored yet. Use `wallet-cli generate` to create one."
      );
      return;
    }

    console.log("\n📂 Stored Wallets:\n");
    entries.forEach(([mnemonic, entry], i) => {
      console.log(`${i + 1}. ${entry.name} (${entry.chain})`);
      if (opts.secrets) {
        console.log(`   Mnemonic: ${mnemonic}`);
      }
      console.log(`   Created: ${new Date(entry.createdAt).toLocaleString()}`);
      console.log(`   Derived wallets: ${entry.wallets.length}`);
      
      entry.wallets.forEach((w, j) => {
        console.log(`     [${w.index}] ${w.publicKey}`);
        if (opts.secrets) {
          console.log(`         Private: ${w.privateKey}`);
        }
      });
      console.log();
    });
  });

program
  .command("delete")
  .alias("rm")
  .description("Delete a stored wallet or mnemonic")
  .action(async () => {
    intro("🗑️ Delete Wallet");

    const entries = storage.getAllEntries();

    if (entries.length === 0) {
      outro("No wallets to delete.");
      return;
    }

    const mnemonicChoice = await select({
      message: "Select mnemonic to manage:",
      options: entries.map(([mnemonic, entry], i) => ({
        value: mnemonic,
        label: `${entry.name} (${entry.chain}) - ${entry.wallets.length} wallets`,
      })),
    });

    if (isCancel(mnemonicChoice)) {
      outro("Cancelled");
      return;
    }

    const entry = storage.getMnemonicEntry(mnemonicChoice as string)!;
    
    const deleteAction = await select({
      message: "What to delete?",
      options: [
        { value: "all", label: "Delete entire mnemonic and all wallets" },
        { value: "wallet", label: "Delete a specific derived wallet" },
        { value: "cancel", label: "Cancel" },
      ],
    });

    if (isCancel(deleteAction) || deleteAction === "cancel") {
      outro("Cancelled");
      return;
    }

    if (deleteAction === "all") {
      const confirmed = await confirm({
        message: `Are you sure you want to delete "${entry.name}" and all ${entry.wallets.length} wallets? This cannot be undone.`,
      });

      if (isCancel(confirmed) || !confirmed) {
        outro("Cancelled");
        return;
      }

      if (storage.deleteMnemonic(mnemonicChoice as string)) {
        outro(`✓ Deleted "${entry.name}"`);
      } else {
        outro("Failed to delete");
      }
    } else {
      if (entry.wallets.length === 0) {
        outro("No derived wallets to delete");
        return;
      }

      const walletChoice = await select({
        message: "Select wallet to delete:",
        options: entry.wallets.map((w) => ({
          value: w.index,
          label: `[${w.index}] ${w.publicKey.slice(0, 16)}...`,
        })),
      });

      if (isCancel(walletChoice)) {
        outro("Cancelled");
        return;
      }

      if (storage.deleteWallet(mnemonicChoice as string, walletChoice as number)) {
        outro(`✓ Deleted wallet ${walletChoice}`);
      } else {
        outro("Failed to delete wallet");
      }
    }
  });

program
  .command("derive")
  .alias("d")
  .description("Derive more wallets from a stored mnemonic")
  .action(async () => {
    intro("🔑 Derive Wallets");

    const entries = storage.getAllEntries();

    if (entries.length === 0) {
      outro("No stored mnemonics. Generate or import one first.");
      return;
    }

    const mnemonicChoice = await select({
      message: "Select mnemonic:",
      options: entries.map(([mnemonic, entry]) => ({
        value: mnemonic,
        label: `${entry.name} (${entry.chain}) - ${entry.wallets.length} wallets`,
      })),
    });

    if (isCancel(mnemonicChoice)) {
      outro("Cancelled");
      return;
    }

    const mnemonic = mnemonicChoice as string;
    const entry = storage.getMnemonicEntry(mnemonic)!;
    const existingIndexes = new Set(entry.wallets.map(w => w.index));
    
    // Find next available index
    let nextIndex = 0;
    while (existingIndexes.has(nextIndex)) nextIndex++;

    while (true) {
      const derived = addWallet(entry.chain, mnemonic, nextIndex)!;
      console.log(`\nWallet ${nextIndex}:`);
      console.log(derived.keypairTable);

      storage.addWallet(mnemonic, {
        index: nextIndex,
        chain: entry.chain,
        publicKey: derived.publicKey,
        privateKey: derived.privateKey,
        path: derived.path,
      });
      console.log("✓ Saved");

      existingIndexes.add(nextIndex);
      nextIndex++;
      while (existingIndexes.has(nextIndex)) nextIndex++;

      const more = await select({
        message: "Derive another?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No, done" },
        ],
      });

      if (isCancel(more) || more === "no") break;
    }

    outro("Done! 🎉");
  });

program
  .command("interactive", { isDefault: true })
  .description("Run in interactive mode")
  .action(async () => {
    intro("🪙 Wallet CLI");

    const action = await select({
      message: "What would you like to do?",
      options: [
        { value: "generate", label: "Generate a new wallet" },
        { value: "import", label: "Import an existing wallet" },
        { value: "derive", label: "Derive more wallets from stored mnemonic" },
        { value: "list", label: "List stored wallets" },
        { value: "list-secrets", label: "List stored wallets (with secrets)" },
        { value: "delete", label: "Delete a wallet" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (isCancel(action) || action === "exit") {
      outro("Goodbye 👋");
      process.exit(0);
    }

    if (action === "list-secrets") {
      await program.parseAsync(["node", "wallet-cli", "list", "--secrets"]);
    } else {
      await program.parseAsync(["node", "wallet-cli", action as string]);
    }
  });

program.parse();
