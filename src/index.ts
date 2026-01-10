#!/usr/bin/env node

import { intro, outro, select, isCancel, text } from "@clack/prompts";
import { generateWallet, addWallet } from "./generateWallet";

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
    const wallet = generateWallet(0);
    console.log(wallet.table);
    console.log(wallet.keypairTable);
    outro("Wallet generated! 🎉");
  }

  if (action === "add") {
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
      const wallet = addWallet(mnemonic, i);
      console.log(`\nWallet ${i}:`);
      console.log(wallet.keypairTable);
    }
  }

  return action; 
}

askWalletAction();
