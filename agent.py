from web3 import Web3
import re
from dotenv import load_dotenv
import os

load_dotenv()

# ============= CONFIG =============
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"          # ← درست شد
USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

PRIVATE_KEY = os.getenv("PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

SPLITTER_ABI = [
    {
        "inputs": [
            {"name": "recipients", "type": "address[]"},
            {"name": "percentages", "type": "uint256[]"},
            {"name": "totalAmount", "type": "uint256"}
        ],
        "name": "splitPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=SPLITTER_ABI)

def parse_intent(text):
    text = text.strip()
    print(f"Received: {text}\n")
    
    percent_pattern = r'(\d+)[٪%]'
    percentages = re.findall(percent_pattern, text)
    percentages = [int(p) for p in percentages]
    
    address_pattern = r'0x[a-fA-F0-9]{40}'
    addresses = re.findall(address_pattern, text)
    
    amount_pattern = r'(\d+)\s*USDC'
    amounts = re.findall(amount_pattern, text, re.IGNORECASE)
    total = int(amounts[0]) * 10**6 if amounts else 2 * 10**6
    
    if not percentages or not addresses:
        return None, None, None, "Could not find percentages or addresses."
    if len(percentages) != len(addresses):
        return None, None, None, "Number of percentages and addresses do not match."
    if sum(percentages) != 100:
        return None, None, None, f"Total must be 100% (current: {sum(percentages)}%)"
    
    return addresses, percentages, total, "ok"


def approve_usdc(account_address, amount):
    print("Approving USDC...")
    usdc_abi = [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"}]
    usdc = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi)
    
    tx = usdc.functions.approve(CONTRACT_ADDRESS, amount).build_transaction({
        'from': account_address,
        'nonce': w3.eth.get_transaction_count(account_address),
        'gas': 100000,
        'gasPrice': w3.eth.gas_price
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print("✅ Approved!")
    return True


def send_split_transaction(recipients, percentages, total_amount):
    if not PRIVATE_KEY:
        print("❌ PRIVATE_KEY not set in .env")
        return False
    
    account = w3.eth.account.from_key(PRIVATE_KEY)
    address = account.address
    
    print(f"Wallet: {address}")
    
    # Check balance
    usdc_abi = [{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]
    balance = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi).functions.balanceOf(address).call()
    print(f"USDC Balance: {balance / 10**6:.2f} USDC")
    
    if balance < total_amount:
        print("❌ Not enough USDC")
        return False
    
    approve_usdc(address, total_amount * 2)
    
    print("Sending split transaction...")
    nonce = w3.eth.get_transaction_count(address)
    
    tx = contract.functions.splitPayment(recipients, percentages, total_amount).build_transaction({
        'from': address,
        'nonce': nonce,
        'gas': 800000,
        'gasPrice': w3.eth.gas_price
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"Hash: {tx_hash.hex()}")
    print("Waiting...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"✅ SUCCESS! Block: {receipt.blockNumber}")
    return True


def main():
    print("=== Arc USDC Splitter Agent ===\n")
    
    while True:
        user_input = input("Enter your intent: ")
        if user_input.lower() == 'exit':
            break
            
        recipients, percentages, total_amount, msg = parse_intent(user_input)
        
        if msg != "ok":
            print("Error:", msg)
            continue
        
        print(f"✅ Parsed: {total_amount / 10**6} USDC → {percentages}%")
        
        confirm = input("\nSend transaction? (yes/y/no): ").lower()
        if confirm in ['yes', 'y']:
            send_split_transaction(recipients, percentages, total_amount)
        else:
            print("Cancelled.\n")

if __name__ == "__main__":
    main()
