import streamlit as st
from web3 import Web3
from dotenv import load_dotenv
import os
import re

load_dotenv()

st.set_page_config(page_title="Arc USDC Splitter", page_icon="🪓", layout="centered")

st.title("🪓 Arc USDC Splitter")
st.markdown("**Arc Testnet - Connect Wallet & Telegram**")

# ===================== CONFIG =====================
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"
USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# ذخیره‌سازی در session
if 'wallet_address' not in st.session_state:
    st.session_state['wallet_address'] = ""
if 'telegram_id' not in st.session_state:
    st.session_state['telegram_id'] = ""

# ===================== WALLET CONNECT =====================
st.subheader("1️⃣ Connect Wallet")
private_key = st.text_input("Enter Private Key (Testnet only)", type="password", placeholder="0x...")

if st.button("Connect Wallet"):
    if private_key.startswith("0x") and len(private_key) == 66:
        st.session_state['wallet_address'] = "Connected (Testnet)"
        st.success("✅ Wallet Connected!")
    else:
        st.error("Invalid Private Key")

# ===================== CONNECT TO TELEGRAM =====================
st.subheader("2️⃣ Connect to Telegram")
tg_id = st.text_input("Enter your Telegram User ID or Username", placeholder="@username or numeric ID")

if st.button("Connect Telegram"):
    if tg_id and st.session_state['wallet_address']:
        st.session_state['telegram_id'] = tg_id
        st.success(f"✅ Connection request sent to Telegram!\nPlease confirm in the bot.")
        # اینجا بعداً پیام به ربات ارسال می‌شود
    else:
        st.warning("First connect your wallet")

# ===================== SPLITTER =====================
st.subheader("3️⃣ Split USDC")
intent = st.text_area("Enter your intent:", 
    placeholder="Send 100 USDC, 40% to 0x123..., 60% to 0x456...",
    height=100)

if st.button("🚀 Send Split Transaction", type="primary"):
    if not st.session_state['wallet_address']:
        st.error("Please connect wallet first")
    else:
        st.success("Transaction sent! (در حال توسعه کامل)")
        st.info("Hash will appear here")

st.caption("Arc USDC Splitter Agent")
