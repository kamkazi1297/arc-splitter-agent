from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os
from web3 import Web3
from gemini_parser import parse_intent_with_gemini

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"
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
user_data = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Arc USDC Splitter Bot\n\n"
        "مثال:\nSend 100 USDC, 50% to 0x123..., 50% to 0x456..."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    user_id = update.message.from_user.id

    await update.message.reply_text("⏳ Parsing your intent...")
    result = parse_intent_with_gemini(text)

    if result.get("status") == "error":
        await update.message.reply_text(f"❌ {result.get('message')}")
        return

    user_data[user_id] = result

    msg = f"✅ Parsed!\n\nAmount: {result.get('total_amount')} USDC\nSplit: {result.get('percentages')}%\nAddresses: {result.get('addresses')}"
    
    keyboard = [
        [InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]
    await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "cancel":
        await query.edit_message_text("❌ Cancelled.")
        return

    result = user_data.get(user_id)
    if not result:
        await query.edit_message_text("Session expired.")
        return

    await query.edit_message_text("🚀 Sending transaction on Arc Testnet...")

    try:
        recipients = result["addresses"]
        percentages = result["percentages"]
        total = int(result["total_amount"]) * 10**6

        account = w3.eth.account.from_key(PRIVATE_KEY)
        addr = account.address

        nonce = w3.eth.get_transaction_count(addr, 'pending')

        # Approve USDC
        usdc_abi = [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"}]
        usdc = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi)
        tx_approve = usdc.functions.approve(CONTRACT_ADDRESS, total*2).build_transaction({
            'from': addr, 'nonce': nonce, 'gas': 100000, 'gasPrice': w3.eth.gas_price
        })
        signed = w3.eth.account.sign_transaction(tx_approve, PRIVATE_KEY)
        w3.eth.send_raw_transaction(signed_approve.rawTransaction)
        nonce += 1

        # Split Payment
        tx = contract.functions.splitPayment(recipients, percentages, total).build_transaction({
            'from': addr, 'nonce': nonce, 'gas': 800000, 'gasPrice': w3.eth.gas_price
        })
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        await query.message.reply_text(f"✅ Transaction Successful!\n\nTx Hash:\n{tx_hash.hex()}\n\nCheck on Arc Explorer.")

    except Exception as e:
        await query.message.reply_text(f"❌ Failed: {str(e)}")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))

    print("🤖 Bot is running... Send /start")
    app.run_polling()

if __name__ == "__main__":
    main()
