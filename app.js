/* =============================================================================
   TRIMDROP.KE — app.js

   WHERE TO CUSTOMISE
   ---------------------------------------------------------------------------
   INVENTORY & PRODUCT IMAGES
     • SHEET_URL — Published CSV from Google Sheets (File → Share → Publish).
     • FALLBACK_PRODUCTS — Sample rows when sheet is empty/unreachable.
       Each row: image_url = direct link to a product photo (same as sheet column).

   CONTACT
     • WA_NUMBER — Your WhatsApp in international digits (no +), e.g. 2547…

   PERSONALITY / BRAND VOICE (customer-facing tone)
     • BRAND_NAME + BRAND_VOICE — Used for WhatsApp prefill text. Edit the
       strings to match how YOU talk (casual, formal, slang, etc.).
     • Product titles & descriptions live in the Sheet, not here.

   Optional: search for buildPrefill() if you want more advanced message logic.
   ============================================================================= */

/** Replace with your published CSV link: Sheet → Share → Publish to web → CSV */
const SHEET_URL = "";

/** WhatsApp digits only (no +). Example is placeholder — put your business line. */
const WA_NUMBER = "254746881264";

/**
 * How you greet customers in the WhatsApp draft — this IS your “personality” online.
 * Tweak wording anytime; keep ${} placeholders out (this file uses plain strings).
 */
const BRAND_NAME = "TrimDrop KE";

const BRAND_VOICE = {
  /** First line of the prefilled message */
  opener: "Hi! I want to place an order with",

  /** Label before Pickup vs Bolt (printed on its own line) */
  deliveryLead: "Delivery preference",

  pickupName: "Pickup Mtaani",
  boltName: "Bolt doorstep",

  /** Shown when someone orders from a specific product card */
  pieceLead: "Piece",

  /** Trailing sign-off (emoji or short line — your vibe) */
  outro: "🔥",
};

/**
 * Fallback catalogue when SHEET_URL is empty or fetch fails — edit/remove when live.
 */
const FALLBACK_PRODUCTS = [
  {
    name: "Urban Oversized Tee",
    category: "Tees",
    price_display: "KSH 1,800",
    price_numeric: 1800,
    old_price_numeric: 2200,
    badge: "new",
    image_url: "",
    available: "yes",
  },
  {
    name: "Street Cargo Jacket",
    category: "Outerwear",
    price_display: "KSH 3,500",
    price_numeric: 3500,
    old_price_numeric: 0,
    badge: "hot",
    image_url: "",
    available: "yes",
  },
  {
    name: "Utility Cargo Pants",
    category: "Bottoms",
    price_display: "KSH 2,800",
    price_numeric: 2800,
    old_price_numeric: 0,
    badge: "",
    image_url: "",
    available: "yes",
  },
  {
    name: "Drop Logo Hoodie",
    category: "Outerwear",
    price_display: "KSH 2,400",
    price_numeric: 2400,
    old_price_numeric: 2900,
    badge: "new",
    image_url: "",
    available: "yes",
  },
];

/**
 * Google Sheet header row (column names can float; parser matches by header text):
 *   name, category, price, old_price, badge, image_url, available, featured
 *
 *   category → must match a filter chip: Tees | Bottoms | Outerwear | Footwear | Accessories
 *   badge → new | hot | empty
 *   featured → optional yes/true (if badge blank, badge shows as New)
 *   available → yes/true to publish the row on the site
 */

let allProducts = [];
let currentFilter = "All";
let selectedProductLine = "";

/* -----------------------------------------------------------------------------
   BOOT
   --------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initTickerXray();
  initFilters();
  initCategoryTiles();
  initModal();
  initNavOrders();
  loadInventory();
});

/* -----------------------------------------------------------------------------
   Cursor
   --------------------------------------------------------------------------- */
function initCursor() {
  const cursor = document.getElementById("cursor");
  const ring = document.getElementById("cursorRing");
  if (!cursor || !ring) return;

  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px)`;
  });

  function animateRing() {
    rx += (mx - rx - 18) * 0.12;
    ry += (my - ry - 18) * 0.12;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();
}

/* -----------------------------------------------------------------------------
   Ticker — X-ray hover (dual spotlight: pointer + lagging cursor ring)
   Clones marquee DOM once so your ticker copy stays in HTML only once.
   --------------------------------------------------------------------------- */
function initTickerXray() {
  const strip = document.getElementById("tickerStrip");
  const shell = document.getElementById("tickerShell");
  const baseInner = strip?.querySelector(".ticker-base .ticker-inner");
  const mount = document.getElementById("tickerXrayMount");
  if (!strip || !shell || !baseInner || !mount) return;

  const clone = baseInner.cloneNode(true);
  clone.classList.add("ticker-inner--xray");
  clone.removeAttribute("id");
  mount.appendChild(clone);

  let hoverTicker = false;
  let rafId = null;

  function stopRaf() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function trackRing() {
    if (!hoverTicker) {
      stopRaf();
      return;
    }

    const r = shell.getBoundingClientRect();
    const ring = document.getElementById("cursorRing");

    /* Fixed-position ring reports offsetParent null — check display instead */
    if (ring && getComputedStyle(ring).display !== "none") {
      const rr = ring.getBoundingClientRect();
      shell.style.setProperty("--mx2", `${rr.left + rr.width / 2 - r.left}px`);
      shell.style.setProperty("--my2", `${rr.top + rr.height / 2 - r.top}px`);
    } else {
      shell.style.setProperty("--mx2", shell.style.getPropertyValue("--mx1"));
      shell.style.setProperty("--my2", shell.style.getPropertyValue("--my1"));
    }

    rafId = requestAnimationFrame(trackRing);
  }

  strip.addEventListener("mouseenter", () => {
    hoverTicker = true;
    strip.classList.add("ticker--hover");
    stopRaf();
    rafId = requestAnimationFrame(trackRing);
  });

  strip.addEventListener("mouseleave", () => {
    hoverTicker = false;
    strip.classList.remove("ticker--hover");
    stopRaf();
  });

  strip.addEventListener("mousemove", (e) => {
    const r = shell.getBoundingClientRect();
    shell.style.setProperty("--mx1", `${e.clientX - r.left}px`);
    shell.style.setProperty("--my1", `${e.clientY - r.top}px`);
  });
}

/* -----------------------------------------------------------------------------
   Sheet + CSV
   --------------------------------------------------------------------------- */
async function loadInventory() {
  const hint = document.getElementById("productsHint");

  const applyFallback = (msg) => {
    allProducts = normalizeRows(FALLBACK_PRODUCTS);
    if (hint) hint.textContent = msg;
    applyFilter();
  };

  if (!SHEET_URL) {
    applyFallback("Set SHEET_URL in app.js — showing fallback samples.");
    return;
  }

  if (hint) hint.textContent = "Loading catalogue…";

  try {
    const res = await fetch(SHEET_URL);
    const csvText = await res.text();
    const parsed = parseCSV(csvText).map(normalizeCsvRow).filter(isAvailableRow);

    if (parsed.length === 0) {
      applyFallback("No rows marked available=yes — fallback samples.");
      return;
    }

    allProducts = parsed;
    if (hint) {
      hint.textContent =
        parsed.length +
        ` piece${parsed.length !== 1 ? "s" : ""} from your sheet.` +
        "";
    }
    applyFilter();
  } catch (e) {
    console.warn("loadInventory", e);
    applyFallback("Could not load CSV — publish the sheet / check SHEET_URL. Fallback samples.");
  }
}

function normalizeCsvRow(row) {
  let priceNum =
    typeof row.price_numeric === "number"
      ? row.price_numeric
      : parseFloat(String(row.price_raw || "").replace(/[^\d.-]/g, "")) || 0;

  let oldNum = row.old_price;
  if (oldNum === undefined && row.old_price_numeric !== undefined)
    oldNum = row.old_price_numeric;
  if (typeof oldNum === "string") oldNum = parseFloat(oldNum.replace(/[^\d.-]/g, "")) || 0;
  if (typeof oldNum !== "number") oldNum = parseFloat(oldNum) || 0;

  let badge = String(row.badge || "").toLowerCase().trim();
  const featured = String(row.featured || "").toLowerCase().trim();
  if (!badge && (featured === "yes" || featured === "true")) badge = "new";

  return {
    name: String(row.name || "").trim(),
    category: capitalizeWord(row.category || ""),
    price_display: row.price_display || formatKsh(priceNum),
    price_numeric: priceNum,
    old_price_numeric: oldNum,
    badge,
    image_url: String(row.image_url || "").trim(),
    available: row.available !== undefined ? String(row.available) : "yes",
  };
}

function capitalizeWord(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function isAvailableRow(p) {
  const v = (p.available || "yes").toLowerCase().trim();
  return (v === "yes" || v === "true") && p.name.length > 0;
}

function normalizeRows(rows) {
  return rows.map(normalizeCsvRow).filter(isAvailableRow);
}

function formatKsh(n) {
  const num = Number(n);
  if (!num || isNaN(num)) return "";
  return "KSH " + Math.round(num).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function parseCSV(text) {
  const lines = text.trim().split(/\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().replace(/"/g, "").toLowerCase());

  return lines.slice(1).map((line) => {
    const vals = splitCsvLine(line);

    /** @type {Record<string,string|number|undefined>} */
    const row = {};
    headers.forEach((h, i) => {
      let v = (vals[i] || "").trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      row[h] = v;

      if (h === "price") {
        const rawStr = String(v).replace(/[^\d.-]/g, "");
        const num = parseFloat(rawStr);
        row.price_numeric = isNaN(num) ? 0 : num;
        if (!isNaN(num) && rawStr !== "") {
          row.price_display = "KSH " + Math.round(num).toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
      }
      if (h === "old_price") {
        const rawStr = String(v).replace(/[^\d.-]/g, "");
        row.old_price = parseFloat(rawStr) || 0;
      }
    });
    return row;
  }).filter(Boolean);
}

function splitCsvLine(line) {
  const vals = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQ && next === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      vals.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  vals.push(cur.trim());
  return vals;
}

/* -----------------------------------------------------------------------------
   Render + filters
   --------------------------------------------------------------------------- */
function setProductFilter(filter) {
  const f = (filter || "All").trim() || "All";
  currentFilter = f;
  document.querySelectorAll(".filter-tab").forEach((b) => {
    const tabFilter = (b.getAttribute("data-filter") || "All").trim();
    b.classList.toggle("active", tabFilter === f);
  });
  applyFilter();
}

function initFilters() {
  document.querySelectorAll(".filter-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      setProductFilter(btn.getAttribute("data-filter"));
    });
  });
}

/** “Shop the drop” mosaic → #products + matching category chip */
function initCategoryTiles() {
  document.querySelectorAll("a.cat-item[data-filter]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const f = link.getAttribute("data-filter");
      if (!f) return;
      setProductFilter(f);
      const products = document.getElementById("products");
      if (!products) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      products.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });
}

function applyFilter() {
  const grid = document.getElementById("productsGrid");
  const emptyEl = document.getElementById("productsEmpty");
  if (!grid) return;

  const list =
    currentFilter === "All"
      ? [...allProducts]
      : allProducts.filter(
          (p) => (p.category || "").toLowerCase() === currentFilter.toLowerCase()
        );

  if (!list.length) {
    grid.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  grid.innerHTML = list.map((p, idx) => productCardHtml(p, idx)).join("");

  grid.querySelectorAll(".product-quick").forEach((quick) => {
    quick.addEventListener("click", (e) => {
      e.preventDefault();
      openOrderFromCard(quick);
    });
  });
}

function badgeHtml(badge) {
  const b = (badge || "").toLowerCase();
  if (b === "hot") return '<span class="product-badge gold">Hot</span>';
  if (b === "new") return '<span class="product-badge">New</span>';
  return "";
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s === undefined || s === null ? "" : String(s);
  return div.innerHTML;
}

/** Attribute-safe */
function escapeAttr(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function productCardHtml(p, index) {
  const img = (p.image_url || "").trim();

  /** Placeholder: first letter — avoid inline HTML that breaks XSS story */
  const initial = escapeHtml((p.name || "?").slice(0, 1).toUpperCase());

  let mediaHtml;
  if (img) {
    mediaHtml = `<img src="${escapeAttr(img)}" alt="${escapeAttr(
      p.name
    )}" loading="lazy" width="480" height="640"/>`;
  } else {
    mediaHtml = `<div class="product-placeholder">${initial}</div>`;
  }

  let priceInner = `<div class="product-price">${escapeHtml(p.price_display)}`;
  const oldNum = Number(p.old_price_numeric) || 0;
  const curNum = Number(p.price_numeric) || 0;
  if (oldNum > curNum && oldNum > 0) {
    priceInner += ` <span class="old">KSH ${oldNum.toLocaleString()}</span>`;
  }
  priceInner += `</div>`;

  const delay = Math.min(index, 14) * 0.045;

  return `
    <article class="product-card product-card--entered" style="animation-delay:${delay}s">
      <div class="product-img-wrap">
        ${mediaHtml}
        ${badgeHtml(p.badge)}
        <button type="button" class="product-quick" data-name="${escapeAttr(p.name)}">Order via WhatsApp</button>
      </div>
      <div class="product-info">
        <div class="product-name">${escapeHtml(p.name)}</div>
        ${priceInner}
      </div>
    </article>
  `.trim();
}

/* -----------------------------------------------------------------------------
   WhatsApp + modal
   --------------------------------------------------------------------------- */
function initNavOrders() {
  document.getElementById("navOrderBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    selectedProductLine = "";
    syncModalWaLink();
    openOrder();
  });
  document.getElementById("ctaWaBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    selectedProductLine = "";
    syncModalWaLink();
    openOrder();
  });

  ["footerWaBtn", "footerWaLink"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      e.preventDefault();
      selectedProductLine = "";
      syncModalWaLink();
      openOrder();
    });
  });
}

function openOrderFromCard(btn) {
  selectedProductLine = btn.getAttribute("data-name") || "";
  syncModalWaLink();

  const line = document.getElementById("orderModalProduct");
  if (line) {
    if (selectedProductLine) {
      line.hidden = false;
      line.textContent = `Piece: ${selectedProductLine}`;
    } else {
      line.hidden = true;
      line.textContent = "";
    }
  }
  openOrder();
}

function waUrl(prefillText) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(prefillText)}`;
}

function buildPrefill() {
  const radio = document.querySelector('input[name="delivery"]:checked');
  const method =
    radio && radio.value === "bolt" ? BRAND_VOICE.boltName : BRAND_VOICE.pickupName;

  let body = `${BRAND_VOICE.opener} ${BRAND_NAME}.

${BRAND_VOICE.deliveryLead}: ${method}`;

  if (selectedProductLine) {
    body += `\n\n${BRAND_VOICE.pieceLead}: ${selectedProductLine}`;
  }
  body += `\n\n${BRAND_VOICE.outro}`;

  return body;
}

function syncModalWaLink() {
  const a = document.getElementById("modalWaContinue");
  if (!a) return;
  a.href = waUrl(buildPrefill());
}

function initModal() {
  const modal = document.getElementById("orderModal");
  const closeBtn = document.getElementById("orderModalClose");

  modal?.querySelectorAll('input[name="delivery"]').forEach((r) => {
    r.addEventListener("change", syncModalWaLink);
  });

  closeBtn?.addEventListener("click", closeOrder);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeOrder();
  });

  syncModalWaLink();
}

function openOrder() {
  syncModalWaLink();

  const modal = document.getElementById("orderModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!selectedProductLine) {
    const line = document.getElementById("orderModalProduct");
    if (line) {
      line.hidden = true;
      line.textContent = "";
    }
  }
}

function closeOrder() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOrder();
});
