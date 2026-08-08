(function () {
  const ACCENTS = {
    emerald: "arc-accent-emerald",
    cyan: "arc-accent-cyan",
    rose: "arc-accent-rose",
    amber: "arc-accent-amber",
    lime: "arc-accent-lime",
    yellow: "arc-accent-yellow",
    blue: "arc-accent-blue",
    sky: "arc-accent-sky",
    indigo: "arc-accent-indigo",
    violet: "arc-accent-violet",
    orange: "arc-accent-orange"
  };

  function detectAccent() {
    const fromBody = document.body && document.body.getAttribute("data-arc-accent");
    if (fromBody && ACCENTS[fromBody]) return ACCENTS[fromBody];
    const path = (location.pathname || "").toLowerCase();
    if (path.includes("batch")) return ACCENTS.rose;
    if (path.includes("role")) return ACCENTS.cyan;
    if (path.includes("giveaway")) return ACCENTS.orange;
    if (path.includes("vest")) return ACCENTS.lime;
    if (path.includes("pay") || path.includes("invoice")) return ACCENTS.yellow;
    if (path.includes("conditional") || path.includes("smart")) return ACCENTS.blue;
    if (path.includes("agentic")) return ACCENTS.sky;
    if (path.includes("workspace")) return ACCENTS.indigo;
    if (path.includes("analytic")) return ACCENTS.cyan;
    if (path.endsWith("/") || path.includes("index")) return ACCENTS.cyan;
    return ACCENTS.emerald;
  }

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "logo-white.svg";
    document.head.appendChild(link);
  }

  function ensureTitle() {
    try {
      const t = (document.title || "").trim();
      if (!t) {
        document.title = "ArcSplit";
        return;
      }
      if (!/^ArcSplit/i.test(t) && !/^Arc\s/i.test(t)) {
        document.title = "ArcSplit · " + t;
      } else if (/^ArcSplit\s*[-–—]\s*/i.test(t)) {
        document.title = t.replace(/^ArcSplit\s*[-–—]\s*/i, "ArcSplit · ");
      }
    } catch {}
  }

  function ensureSharedCss() {
    let l = document.querySelector('link[data-arc-shared]');
    if (!l) {
      l = document.createElement("link");
      l.rel = "stylesheet";
      l.setAttribute("data-arc-shared", "1");
      document.head.appendChild(l);
    }
    // cache-bust so updates always load
    const base = "arc-shared.css";
    const ver = "20260808b";
    if (!l.href || l.href.indexOf(ver) === -1) {
      l.href = base + "?v=" + ver;
    }
  }

  /**
   * Late-injected CSS — always wins over page <style> blocks.
   * Uses html.light (class on documentElement) matching all modules.
   */
  function injectForceStyles() {
    if (document.getElementById("arc-force-css")) return;
    const s = document.createElement("style");
    s.id = "arc-force-css";
    s.textContent = `
/* ===== ArcSplit force layer (last) ===== */
.arc-hdr-btn,#themeBtn,.arc-hub-link,#connectBtn.arc-hdr-btn,#connectHeaderBtn.arc-hdr-btn{
  height:2.75rem!important;min-height:2.75rem!important;box-sizing:border-box;
}
#themeBtn,.arc-btn-icon{width:2.75rem!important;min-width:2.75rem!important;padding:0!important}

/* Dark glass buttons */
html:not(.light) .arc-btn-glass,
html:not(.light) #connectBtn,
html:not(.light) #connectHeaderBtn,
html:not(.light) #connectWalletBtn,
html:not(.light) .arc-hub-link,
html:not(.light) #themeBtn{
  border-radius:11px!important;
  border:1px solid rgba(255,255,255,.16)!important;
  background:linear-gradient(165deg,rgba(255,255,255,.16) 0%,rgba(42,48,82,.82) 48%,rgba(16,18,36,.92) 100%)!important;
  box-shadow:0 8px 20px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.18),inset 0 -2px 0 rgba(0,0,0,.2)!important;
  backdrop-filter:blur(16px) saturate(140%)!important;
  -webkit-backdrop-filter:blur(16px) saturate(140%)!important;
}
html:not(.light) #connectBtn,
html:not(.light) #connectHeaderBtn,
html:not(.light) #connectWalletBtn,
html:not(.light) .arc-btn-connect{
  border-color:var(--arc-accent-border,rgba(34,211,238,.4))!important;
  background:linear-gradient(160deg,var(--arc-accent-soft,rgba(34,211,238,.18)) 0%,rgba(36,42,72,.72) 45%,rgba(0,0,0,.18) 100%)!important;
  color:var(--arc-accent,#22d3ee)!important;
}
html:not(.light) #connectBtn i,
html:not(.light) #connectHeaderBtn i,
html:not(.light) #connectWalletBtn i,
html:not(.light) .arc-btn-connect i{color:var(--arc-accent,#22d3ee)!important}

/* LIGHT MODE — solid white cards, high contrast */
html.light .arc-header,
html.light header.glass{
  background:linear-gradient(160deg,#fff 0%,rgba(255,255,255,.85) 100%)!important;
  border:1px solid rgba(15,23,42,.10)!important;
  box-shadow:0 10px 28px rgba(15,23,42,.08),inset 0 1px 0 #fff!important;
}

html.light .arc-btn-glass,
html.light .arc-hub-link,
html.light #themeBtn,
html.light #connectBtn,
html.light #connectHeaderBtn,
html.light #connectWalletBtn,
html.light button.app-button:not([class*="bg-gradient"]),
html.light button.arc-btn-glass,
html.light a.arc-btn-glass,
html.light button[class*="bg-white/5"],
html.light button[class*="bg-rose-500/10"],
html.light button[class*="bg-sky-500/10"],
html.light button[class*="bg-violet-500/10"],
html.light button[class*="bg-emerald-500/10"],
html.light button[class*="bg-cyan-500/10"],
html.light button[class*="bg-orange-500/10"],
html.light button[class*="bg-amber-500/10"],
html.light button[class*="bg-lime-500/10"],
html.light button[class*="bg-blue-500/10"]{
  background:#ffffff!important;
  border:1px solid rgba(15,23,42,.14)!important;
  box-shadow:0 4px 14px rgba(15,23,42,.10),0 1px 2px rgba(15,23,42,.06)!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  filter:none!important;
}

html.light .arc-hub-link,
html.light #themeBtn{color:#0f172a!important}
html.light .arc-hub-link i{color:#0f172a!important}

html.light #connectBtn,
html.light #connectHeaderBtn,
html.light #connectWalletBtn,
html.light .arc-btn-connect{
  background:#ffffff!important;
  border:1.5px solid var(--arc-accent-border,rgba(6,182,212,.45))!important;
  color:var(--arc-accent,#0891b2)!important;
  box-shadow:0 4px 16px rgba(15,23,42,.10),0 0 0 3px color-mix(in srgb,var(--arc-accent,#22d3ee) 14%,transparent)!important;
}
html.light #connectBtn i,
html.light #connectHeaderBtn i,
html.light #connectWalletBtn i,
html.light .arc-btn-connect i{color:var(--arc-accent,#0891b2)!important}

html.light .arc-btn-glass:hover,
html.light .arc-hub-link:hover,
html.light #themeBtn:hover,
html.light #connectBtn:hover,
html.light #connectHeaderBtn:hover{
  background:#f8fafc!important;
  border-color:rgba(15,23,42,.22)!important;
  filter:none!important;
}

html.light .app-button[class*="bg-gradient"],
html.light button[class*="bg-gradient-to-r"]{
  color:#fff!important;
  box-shadow:0 8px 22px rgba(15,23,42,.14),inset 0 1px 0 rgba(255,255,255,.35)!important;
}

#toast.arc-toast,#toast{
  position:fixed!important;bottom:1.5rem!important;left:50%!important;
  transform:translateX(-50%)!important;z-index:9999!important;
  max-width:min(92vw,28rem);padding:.85rem 1.25rem!important;
  border-radius:14px!important;background:rgba(15,23,42,.94)!important;
  border:1px solid rgba(255,255,255,.1)!important;color:#fff!important;
  font-size:.8rem!important;font-weight:600!important;
  box-shadow:0 16px 40px rgba(0,0,0,.35)!important;
}
html.light #toast,html.light #toast span,html.light #toast i{color:#fff!important}

@media(max-width:640px){
  .arc-hub-link span.arc-hub-text{display:none}
  .arc-hdr-btn,#themeBtn,.arc-hub-link{height:2.5rem!important;min-height:2.5rem!important}
  #themeBtn,.arc-btn-icon{width:2.5rem!important;min-width:2.5rem!important}
}
`;
    (document.head || document.documentElement).appendChild(s);
  }

  function findHeaderActions() {
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn && themeBtn.parentElement) return themeBtn.parentElement;
    const connect =
      document.getElementById("connectBtn") ||
      document.getElementById("connectHeaderBtn");
    if (connect && connect.parentElement) {
      const parent = connect.parentElement;
      if (parent.classList.contains("flex") || parent.querySelector("#themeBtn")) {
        return parent;
      }
    }
    return null;
  }

  function workspaceQuery() {
    try {
      const p = new URLSearchParams(location.search);
      const ws = p.get("workspace") || p.get("ws");
      return ws ? ("?workspace=" + encodeURIComponent(ws)) : "";
    } catch {
      return "";
    }
  }

  function isHubPage() {
    const path = (location.pathname || "").toLowerCase();
    return path.endsWith("/") || /index\.html?$/i.test(path) || path === "";
  }

  function ensureHubLink() {
    if (document.getElementById("arcHubLink")) return;
    if (isHubPage()) return;

    const a = document.createElement("a");
    a.id = "arcHubLink";
    a.href = "index.html" + workspaceQuery();
    a.className = "arc-hub-link arc-hdr-btn arc-btn-glass";
    a.innerHTML = '<i class="fas fa-home"></i><span class="arc-hub-text">Hub</span>';
    a.title = "Back to Hub";

    const actions = findHeaderActions();
    if (actions) {
      const themeBtn = document.getElementById("themeBtn");
      if (themeBtn && themeBtn.parentElement === actions) {
        actions.insertBefore(a, themeBtn);
      } else {
        actions.insertBefore(a, actions.firstChild);
      }
    } else {
      a.classList.add("arc-hub-fixed");
      a.style.cssText =
        "position:fixed;top:.85rem;right:.85rem;z-index:9000;height:2.5rem;padding:0 .85rem;display:inline-flex;align-items:center;gap:.4rem;border-radius:11px;text-decoration:none;font-weight:600;font-size:.75rem";
      document.body.appendChild(a);
    }
  }

  function styleConnectButtons(accentClass) {
    const ids = ["connectBtn", "connectHeaderBtn", "connectWalletBtn"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("arc-btn-connect", "arc-btn-glass", "arc-hdr-btn", accentClass);
      el.classList.remove("bg-white", "text-gray-950", "text-black");
    });
    const theme = document.getElementById("themeBtn");
    if (theme) theme.classList.add("arc-btn-icon", "arc-btn-glass", "arc-hdr-btn");
    const disc =
      document.getElementById("disconnectBtn") ||
      document.getElementById("disconnectWalletBtn");
    if (disc) disc.classList.add("arc-btn-icon", "arc-btn-glass");
  }

  function polishToast() {
    const t = document.getElementById("toast");
    if (t) t.classList.add("arc-toast");
  }

  window.arcSetConnectLoading = function (loading) {
    const btn =
      document.getElementById("connectBtn") ||
      document.getElementById("connectHeaderBtn") ||
      document.getElementById("connectWalletBtn");
    if (!btn) return;
    if (loading) {
      btn.dataset.arcPrev = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fas fa-circle-notch arc-spin"></i> <span>Connecting…</span>';
    } else {
      btn.disabled = false;
      if (btn.dataset.arcPrev) {
        btn.innerHTML = btn.dataset.arcPrev;
        delete btn.dataset.arcPrev;
      }
    }
  };

  function wrapConnectHandlers() {
    if (!window.ethereum || window.__arcChromeEthWrapped) return;
    window.__arcChromeEthWrapped = true;
    const original = window.ethereum.request.bind(window.ethereum);
    window.ethereum.request = async function (args) {
      const method = args && args.method;
      const isConnect =
        method === "eth_requestAccounts" || method === "wallet_requestPermissions";
      if (isConnect) window.arcSetConnectLoading(true);
      try {
        return await original(args);
      } finally {
        if (isConnect) {
          setTimeout(() => window.arcSetConnectLoading(false), 400);
        }
      }
    };
  }

  function emptyStateUpgrade() {
    const re =
      /no (transactions|history|activity|batch|vesting|giveaway|links|invoices|role splits|plans)/i;
    document
      .querySelectorAll(
        "[id*='history'], [id*='History'], [id*='activity'], [id*='Activity'], [id*='linkList'], [id*='invoice']"
      )
      .forEach((box) => {
        if (!box) return;
        if (box.children.length === 1) {
          const child = box.children[0];
          if (child && re.test(child.textContent || "")) {
            child.classList.add("arc-empty");
            if (!child.querySelector("i")) {
              const icon = document.createElement("i");
              icon.className = "fas fa-inbox";
              child.prepend(icon);
            }
          }
        }
        if (
          box.children.length === 0 &&
          re.test((box.textContent || "").trim())
        ) {
          box.classList.add("arc-empty");
        }
      });
  }

  function polishActionButtons() {
    const sels = [
      "button.app-button",
      'button[onclick*="addRecipient"]',
      'button[onclick*="AddToken"]',
      'button[onclick*="openCustom"]',
      'button[onclick*="importCSV"]',
      'button[onclick*="openSaveTemplate"]',
      'button[onclick*="openLoadTemplate"]',
      'button[onclick*="Distribute"]',
      'button[onclick*="distribute"]',
      'button[onclick*="Refresh"]',
      'button[onclick*="refresh"]',
      'button[onclick*="export"]',
      'button[onclick*="import"]',
      'button[onclick*="clearAll"]',
      'button[onclick*="showExtract"]',
      'button[onclick*="addRole"]',
      'button[onclick*="AddRole"]',
      'button[onclick*="linkTelegram"]',
      'button[onclick*="copy"]',
      'button[onclick*="Copy"]'
    ];
    document.querySelectorAll(sels.join(",")).forEach((el) => {
      if (
        el.id === "connectBtn" ||
        el.id === "connectHeaderBtn" ||
        el.id === "connectWalletBtn"
      )
        return;
      if (el.className && String(el.className).includes("bg-gradient")) return;
      el.classList.add("arc-btn-glass");
    });
  }

  function elevateHeaders() {
    document.querySelectorAll("div.rounded-3xl, header.glass, div.glass").forEach((el) => {
      const hasLogo = el.querySelector('img[src*="logo"], img[src*="trace"]');
      const hasConnect = el.querySelector(
        "#connectBtn, #connectHeaderBtn, #connectWalletBtn, #themeBtn"
      );
      if (hasLogo && hasConnect) {
        el.classList.add("arc-header");
        if (!el.style.position) el.style.position = "relative";
      }
    });
  }

  function normalizeHeaderSpacing() {
    const actions = findHeaderActions();
    if (!actions) return;
    actions.classList.add("flex", "items-center");
    if (!actions.className.includes("gap-")) {
      actions.style.gap = "0.5rem";
    }
  }

  function boot() {
    ensureSharedCss();
    injectForceStyles();
    ensureFavicon();
    ensureTitle();
    const accent = detectAccent();
    if (document.body) document.body.classList.add(accent);
    ensureHubLink();
    styleConnectButtons(accent);
    polishToast();
    wrapConnectHandlers();
    emptyStateUpgrade();
    polishActionButtons();
    elevateHeaders();
    normalizeHeaderSpacing();
    setTimeout(() => {
      styleConnectButtons(accent);
      polishActionButtons();
      ensureHubLink();
      elevateHeaders();
      injectForceStyles();
    }, 600);
    setTimeout(() => emptyStateUpgrade(), 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
