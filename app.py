import streamlit as st
from web3 import Web3
from dotenv import load_dotenv
import os
import re
import time

load_dotenv()

st.set_page_config(page_title="Arc USDC Splitter", page_icon="🪓", layout="centered")

st.title("🪓 Arc USDC Splitter")
st.markdown("**Split USDC on Arc Testnet**")

# ================== CONFIG ==================
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"
USDC_ADDRESS = "0x3600000000000000000000000000000000000000"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

if not PRIVATE_KEY:
    st.error("❌ PRIVATE_KEY not found in .env file")
    st.stop()

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# ================== PARSER ==================
def parse_intent(text):
    text = text.strip()
    addresses = re.findall(r'0x[a-fA-F0-9]{40}', text)
    percentages = [int(p) for p in re.findall(r'(\d+)[٪%]', text)]
    amounts = re.findall(r'(\d+)\s*USDC', text, re.IGNORECASE)
    total = int(amounts[0]) if amounts else 10
    
    if not addresses or not percentages:
        return None, None, None, "Could not find addresses or percentages"
    if len(addresses) != len(percentages):
        return None, None, None, "Number of addresses and percentages do not match"
    if sum(percentages) != 100:
        return None, None, None, f"Total percentage must be 100% (current: {sum(percentages)}%)"
    
    return addresses, percentages, total * 10**6, "ok"

# ================== UI ==================
intent = st.text_area("Enter your intent:", 
    placeholder="Send 50 USDC, 40% to 0x123..., 60% to 0x456...",
    height=100)

if st.button("🔍 Parse Intent", use_container_width=True):
    recipients, percentages, total_amount, msg = parse_intent(intent)
    if msg == "ok":
        st.session_state['data'] = (recipients, percentages, total_amount)
        st.success("✅ Parsed Successfully!")
        st.info(f"**Amount:** {total_amount//10**6} USDC  |  **Split:** {percentages}%")
    else:
        st.error(msg)

if st.button("🚀 Send Real Transaction", type="primary", use_container_width=True):
    if 'data' not in st.session_state:
        st.warning("Please parse first")
    else:
        recipients, percentages, total_amount = st.session_state['data']
        
        with st.spinner("Sending transaction..."):
            try:
                account = w3.eth.account.from_key(PRIVATE_KEY)
                addr = account.address
                
                st.info(f"Wallet: {addr}")
                
                # Check balance
                balance_contract = w3.eth.contract(address=USDC_ADDRESS, abi=[{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}])
                balance = balance_contract.functions.balanceOf(addr).call()
                st.info(f"USDC Balance: {balance / 10**6:.2f} USDC")
                
                if balance < total_amount:
                    st.error("Not enough USDC balance")
                    st.stop()

                nonce = w3.eth.get_transaction_count(addr, 'pending')

                # Approve USDC
                usdc_abi = [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"}]
                usdc = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi)
                tx_approve = usdc.functions.approve(CONTRACT_ADDRESS, total_amount*2).build_transaction({
                    'from': addr, 'nonce': nonce, 'gas': 150000, 'gasPrice': w3.eth.gas_price
                })
                signed_approve = w3.eth.account.sign_transaction(tx_approve, PRIVATE_KEY)
                approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
                st.write(f"Approve Hash: {approve_hash.hex()}")
                nonce += 1
                time.sleep(3)

                # Split Payment
                splitter_abi = [{
                    "inputs": [
                        {"name": "recipients", "type": "address[]"},
                        {"name": "percentages", "type": "uint256[]"},
                        {"name": "totalAmount", "type": "uint256"}
                    ],
                    "name": "splitPayment",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }]
                contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=splitter_abi)
                
                tx = contract.functions.splitPayment(recipients, percentages, total_amount).build_transaction({
                    'from': addr, 'nonce': nonce, 'gas': 800000, 'gasPrice': w3.eth.gas_price
                })
                signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

                # Fix 0x for explorer
                tx_hash_str = tx_hash.hex()
                if not tx_hash_str.startswith('0x'):
                    tx_hash_str = "0x" + tx_hash_str

                st.success("✅ Transaction Sent Successfully!")
                st.code(tx_hash_str)
                st.markdown(f"[🔗 View on Arc Explorer](https://testnet.arcscan.app/tx/{tx_hash_str})")

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

st.caption("Arc USDC Splitter Agent • Testnet")
