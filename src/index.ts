#!/usr/bin/env node

import { intro, outro, select, isCancel, text } from "@clack/prompts";
import clipboard from "clipboardy";
import { generateWallet, addWallet, type Chain } from "./generateWallet";

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

export async function askWalletAction() {
  intro("🪙 Wallet CLI");

  const action = await select({
    message: "What would you like to do?",
    options: [
      { value: "generate", label: "Generate a new wallet" },
      { value: "add", label: "Add an existing wallet" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (isCancel(action) || action === "exit") {
    outro("Goodbye 👋");
    process.exit(0);
  }

  if (action === "generate") {
    const chain = await selectChain();
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
  }

  if (action === "add") {
    const chain = await selectChain();

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

    for (let i = 0; i < 10; i++) {
      const wallet = addWallet(chain, mnemonic, i)!;
      console.log(`\nWallet ${i}:`);
      console.log(wallet.keypairTable);
    }
  }

  return action; 
}

askWalletAction();
