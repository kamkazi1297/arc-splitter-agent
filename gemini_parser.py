import re

def parse_intent_with_gemini(text):
    text = text.strip()
    
    # پیدا کردن آدرس‌ها
    address_pattern = r'0x[a-fA-F0-9]{40}'
    addresses = re.findall(address_pattern, text)
    
    # پیدا کردن درصد‌ها
    percent_pattern = r'(\d+)[٪%]'
    percentages = [int(p) for p in re.findall(percent_pattern, text)]
    
    # پیدا کردن مقدار USDC
    amount_pattern = r'(\d+)\s*USDC'
    amounts = re.findall(amount_pattern, text, re.IGNORECASE)
    total = int(amounts[0]) if amounts else 100
    
    if not addresses or not percentages:
        return {"status": "error", "message": "Could not find addresses or percentages"}
    
    if len(percentages) != len(addresses):
        return {"status": "error", "message": "Number of addresses and percentages do not match"}
    
    if sum(percentages) != 100:
        return {"status": "error", "message": f"Total must be 100% (current: {sum(percentages)}%)"}
    
    return {
        "addresses": addresses,
        "percentages": percentages,
        "total_amount": total,
        "status": "ok"
    }
