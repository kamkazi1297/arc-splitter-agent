# ArcSplit

**Professional on-chain token distribution suite on Arc Testnet.**

ArcSplit is a modular web application for splitting, scheduling, and automating token distributions — built for teams, creators, and on-chain organizations.

🌐 **Live:** [https://arcsplit.kamkazi-1297.workers.dev](https://arcsplit.kamkazi-1297.workers.dev)  
🤖 **Telegram Bot:** [@ArcSplitPro_bot](https://t.me/ArcSplitPro_bot)  
⛓ **Network:** Arc Testnet (`5042002`)

---

## Features

| Module | Description |
|--------|-------------|
| **Token Split** | Split any token to multiple wallets by percentage or amount |
| **Batch Split** | Multi-token distributions in sequential batches |
| **Role Engine** | Define team roles and allocate by role |
| **Giveaway** | Pick random winners and distribute equal shares |
| **Vesting** | Cliff + vesting schedules with calendar view |
| **Arc Pay** | Payment links and smart invoices |
| **Conditional** | No-code rules: time, balance, price, NFT gates |
| **Agentic** | Push-based rules with relayer-ready execution |
| **Workspace** | Team workspaces, members, and permissions |
| **Dashboard** | Analytics, volume, and activity insights |

---

## Tech Stack

- **Frontend:** HTML · Tailwind CSS · Ethers.js v6
- **Chain:** Arc Testnet (USDC gas)
- **Data:** Supabase (history, workspaces, payment links)
- **Bot:** Cloudflare Workers + Telegram Bot API + KV
- **UI:** Glassmorphism · light/dark mode · responsive

---

## Network

| Parameter | Value |
|-----------|--------|
| Name | Arc Network Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | [testnet.arcscan.app](https://testnet.arcscan.app) |
| Native gas | USDC |

**Tokens used in demos**

| Token | Address | Decimals |
|-------|---------|----------|
| USDC | `0x3600000000000000000000000000000000000000` | 6 |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8 |

---

## Project Structure

```
├── index.html                 # Hub (main entry)
├── split.html                 # Token Split
├── BatchSplit.html            # Batch Split
├── ArcRoleSplitter.html       # Role Engine
├── giveaway.html              # Giveaway
├── ArcsplitVesting.html       # Vesting
├── ArcPayLink.html            # Payment links & invoices
├── smartConditionalsplit.html # Conditional rules
├── AgenticSplit.html          # Agentic rules
├── Workspace.html             # Team workspace
├── ArcAnalytics.html          # Dashboard
├── db.js                      # Supabase / cloud helpers
├── workspace-guard.js         # Workspace access guard
├── logo-white.svg
├── trace-raw.svg
└── bot.js                     # Telegram bot (Workers)
```

---

## Hub

The hub (`/`) is the central entry point:

- Wallet connect with auto-switch to Arc Testnet
- Module grid with workspace-aware deep links
- Recent activity from cloud history
- Theme toggle · Telegram bot shortcut

---

## Telegram Bot

[@ArcSplitPro_bot](https://t.me/ArcSplitPro_bot)

| Command | Description |
|---------|-------------|
| `/start` | Welcome + connect wallet |
| `/menu` | Full tools menu |
| `/wallet` | Show connected address |
| `/balance` | USDC · EURC · cirBTC |
| `/history` | Recent transactions |
| `/status` | Network · wallet · last TX |
| `/help` | Help |
| `send amount TOKEN addr1 addr2 …` | Split preview → confirm on site |

**Bot endpoints (Workers)**

- `POST /save-connection` — link Telegram chat ↔ wallet
- `POST /save-workspace` — bind workspace to chat
- `POST /send-tx` — push TX notification to user

---

## Workspace

Workspaces support shared team context across modules:

- Create / join workspace
- Roles & permissions (owner · admin · member · viewer)
- Activity feed
- Deep links: `?workspace=<id>` on any module

---

## Getting Started

1. Add **Arc Network Testnet** in MetaMask (or connect via the hub — it will prompt).
2. Open the [Hub](https://arcsplit.kamkazi-1297.workers.dev).
3. Connect wallet.
4. Pick a module and run a distribution.
5. Optional: open [@ArcSplitPro_bot](https://t.me/ArcSplitPro_bot) and link your wallet for TX alerts.

---

## Roadmap

- [x] Core split modules (Split, Batch, Roles, Giveaway, Vesting)
- [x] Arc Pay · Conditional · Agentic
- [x] Workspace & cloud history
- [x] Hub + Telegram bot
- [ ] Unified notification from all modules
- [ ] Full workspace binding in bot menu
- [ ] Polish & production hardening

---

## License

Private / proprietary — all rights reserved unless otherwise stated.

---

Built for professional on-chain teams on **Arc**.
