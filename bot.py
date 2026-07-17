<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arc USDC Splitter - Pro</title>
  <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.0/dist/ethers.umd.min.js"></script>
  <style>
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      background: linear-gradient(135deg, #0a0a1f, #1a1a35); 
      color: #e0e0ff; 
      margin: 0; 
      padding: 20px; 
    }
    .container { 
      max-width: 780px; 
      margin: 0 auto; 
      background: rgba(255,255,255,0.06); 
      padding: 40px; 
      border-radius: 24px; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.7); 
    }
    h1 { color: #00ffaa; margin-bottom: 8px; }
    button { 
      padding: 14px 32px; 
      margin: 8px; 
      font-size: 17px; 
      border: none; 
      border-radius: 14px; 
      cursor: pointer; 
      transition: 0.3s; 
    }
    .connect-btn { background: #00ffaa; color: #000; font-weight: bold; }
    .send-btn { background: #ff3366; color: white; font-weight: bold; }
    textarea { 
      width: 100%; 
      height: 150px; 
      padding: 18px; 
      margin: 15px 0; 
      border-radius: 14px; 
      background: #151525; 
      color: white; 
      border: 1px solid #00ffaa; 
      font-size: 16px; 
    }
    #status { 
      margin: 20px 0; 
      padding: 16px; 
      border-radius: 12px; 
      background: rgba(0,255,170,0.1); 
      min-height: 70px; 
      word-break: break-all; 
    }
    .history { 
      text-align: left; 
      margin-top: 30px; 
      max-height: 280px; 
      overflow-y: auto; 
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🪓 Arc USDC Splitter</h1>
    <p><strong>Professional • Arc Testnet</strong></p>

    <button class="connect-btn" onclick="connectWallet()">🔗 Connect MetaMask</button>
    
    <p id="status"></p>

    <h3>Enter Your Split Intent</h3>
    <textarea id="intent" placeholder="Send 100 USDC, 50% to 0x123..., 50% to 0x456..."></textarea><br>
    
    <button class="send-btn" onclick="sendSplit()">🚀 Send Split Transaction</button>

    <h3 style="margin-top:40px">Recent Transactions</h3>
    <div id="history" class="history"></div>
  </div>

  <script>
    let signer = null;
    let userAddress = null;
    let transactions = JSON.parse(localStorage.getItem('arcTxHistory') || '[]');

    async function connectWallet() {
      if (!window.ethereum) return alert("MetaMask not found!");
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        document.getElementById("status").innerHTML = `✅ Connected: ${userAddress}`;
      } catch (e) {
        document.getElementById("status").innerHTML = "❌ Connection failed";
      }
    }

    async function sendSplit() {
      if (!signer) return alert("Please connect MetaMask first!");
      
      const intentText = document.getElementById("intent").value.trim();
      if (!intentText) return alert("Please enter your intent!");

      try {
        document.getElementById("status").innerHTML = "⏳ Sending transaction...";

        // شبیه‌سازی ارسال (بعداً واقعی می‌کنیم)
        const fakeHash = "0x" + Math.random().toString(16).substr(2, 64);
        const time = new Date().toLocaleString();

        transactions.unshift({ hash: fakeHash, intent: intentText, time: time });
        localStorage.setItem('arcTxHistory', JSON.stringify(transactions));
        renderHistory();

        document.getElementById("status").innerHTML = `
          ✅ Transaction Sent Successfully!<br><br>
          Hash: ${fakeHash}<br><br>
          <a href="https://testnet.arcscan.app/tx/${fakeHash}" target="_blank" style="color:#00ffaa;">
            🔗 View on Arc Explorer
          </a>
        `;
      } catch (e) {
        document.getElementById("status").innerHTML = "❌ Error occurred";
      }
    }

    function renderHistory() {
      let html = "";
      transactions.forEach(tx => {
        html += `
          <div style="background:rgba(255,255,255,0.05); padding:12px; margin:8px 0; border-radius:10px; font-size:14px;">
            <small>${tx.time}</small><br>
            ${tx.intent}<br>
            <small><a href="https://testnet.arcscan.app/tx/${tx.hash}" target="_blank">View Transaction</a></small>
          </div>`;
      });
      document.getElementById("history").innerHTML = html || "<p>No transactions yet.</p>";
    }

    // Load history when page opens
    renderHistory();
  </script>
</body>
</html>
