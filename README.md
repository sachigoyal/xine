# 🔐 wallet-cli

Minimal CLI for generating & managing Solana/Ethereum wallets.

## Quick Start

```bash
bun install
bun run src/index.ts
```

## Commands

| Command | Description |
|---------|-------------|
| `generate -c <chain>` | Create new wallet (solana/ethereum) |
| `import` | Import existing mnemonic |
| `derive` | Derive additional wallets |
| `list [-s]` | View wallets (`-s` shows secrets) |
| `delete` | Remove a wallet |

## Storage

Wallets saved to `~/.wallet-cli/wallets.json`

---

MIT License
