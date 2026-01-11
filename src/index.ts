#!/usr/bin/env node

import { Command } from "commander";
import { intro, outro, select, isCancel, text, confirm } from "@clack/prompts";
import clipboard from "clipboardy";
import { generateWallet, addWallet, type Chain } from "./generateWallet";
import { saveWallet, loadWallets, getStoragePath, deleteWallet } from "./storage";

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
        saveWallet({
          name: walletName,
          chain,
          mnemonic: wallet.mnemonic,
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey,
          createdAt: new Date().toISOString(),
        });
        console.log(`✓ Saved to ${getStoragePath()}`);
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

    outro("Import complete! 🎉");
  });

program
  .command("list")
  .alias("ls")
  .description("List all stored wallets")
  .action(() => {
    const wallets = loadWallets();

    if (wallets.length === 0) {
      console.log(
        "No wallets stored yet. Use `wallet-cli generate` to create one."
      );
      return;
    }

    console.log("\n📂 Stored Wallets:\n");
    wallets.forEach((w, i) => {
      console.log(`${i + 1}. ${w.name} (${w.chain})`);
      console.log(`   Public Key: ${w.publicKey}`);
      console.log(`   Created: ${new Date(w.createdAt).toLocaleString()}\n`);
    });
  });

program
  .command("delete")
  .alias("rm")
  .description("Delete a stored wallet")
  .action(async () => {
    intro("🗑️ Delete Wallet");

    const wallets = loadWallets();

    if (wallets.length === 0) {
      outro("No wallets to delete.");
      return;
    }

    const walletIndex = await select({
      message: "Select wallet to delete:",
      options: wallets.map((w, i) => ({
        value: i,
        label: `${w.name} (${w.chain}) - ${w.publicKey.slice(0, 8)}...`,
      })),
    });

    if (isCancel(walletIndex)) {
      outro("Cancelled");
      return;
    }

    const wallet = wallets[walletIndex as number]!;
    const confirmed = await confirm({
      message: `Are you sure you want to delete "${wallet.name}"? This cannot be undone.`,
    });

    if (isCancel(confirmed) || !confirmed) {
      outro("Cancelled");
      return;
    }

    if (deleteWallet(walletIndex as number)) {
      outro(`✓ Deleted "${wallet.name}"`);
    } else {
      outro("Failed to delete wallet");
    }
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
        { value: "list", label: "List stored wallets" },
        { value: "delete", label: "Delete a wallet" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (isCancel(action) || action === "exit") {
      outro("Goodbye 👋");
      process.exit(0);
    }

    await program.parseAsync(["node", "wallet-cli", action as string]);
  });

program.parse();
