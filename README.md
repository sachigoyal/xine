# wallet-cli

CLI for generating and managing Solana/Ethereum wallets.

## Install

```bash
bun install
```

## Usage

```bash
# Interactive mode
bun run src/index.ts

# Generate new wallet
bun run src/index.ts generate -c solana

# Import existing mnemonic
bun run src/index.ts import

# List stored wallets
bun run src/index.ts list
bun run src/index.ts list -s  # with secrets

# Derive more wallets from stored mnemonic
bun run src/index.ts derive

# Delete wallet
bun run src/index.ts delete
```

## Storage

Wallets stored at `~/.wallet-cli/wallets.json`

```json
{
  "mnemonic phrase here": {
    "name": "my-wallet",
    "chain": "solana",
    "createdAt": "...",
    "wallets": [
      { "index": 0, "publicKey": "...", "privateKey": "...", "path": "..." }
    ]
  }
}
```

## License

MIT
