# Arc Splitter Agent

An AI-powered USDC payment splitter on Arc Testnet.

## Features
- Natural language intent parsing (supports Persian & English)
- Automatic USDC split between multiple addresses
- Smart Contract deployed on Arc Testnet
- Full on-chain execution

## How it works
1. User writes: `2 USDC split 60% to 0x... and 40% to 0x...`
2. Agent parses the intent
3. Approves & sends transaction automatically

## Tech Stack
- Blockchain: Arc Testnet (EVM)
- Smart Contract: Solidity
- Agent: Python + Web3.py
- Wallet: MetaMask

## Demo
(اینجا بعداً ویدیو یا گیف بذار)

## Contract Address
`0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF`

## How to run locally
```bash
git clone <your-repo>
cd arc-splitter-agent
python3 -m venv venv
source venv/bin/activate
pip install web3 python-dotenv
cp .env.example .env
# Add your PRIVATE_KEY
python agent.py
