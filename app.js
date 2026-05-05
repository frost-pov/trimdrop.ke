/* =============================================================================
   TRIMDROP.KE — app.js

   WHERE TO CUSTOMISE
   ---------------------------------------------------------------------------
   INVENTORY & PRODUCT IMAGES
     • SHEET_URL — Published CSV from Google Sheets (File → Share → Publish).
     • FALLBACK_PRODUCTS — Sample rows when sheet is empty/unreachable.
       Each row: image_url = direct link to a product photo (same as sheet column).

   CONTACT
     • WA_NUMBER — Verified business line; do not replace with a placeholder (see below).

   PERSONALITY / BRAND VOICE (customer-facing tone)
     • BRAND_NAME + BRAND_VOICE — Used for WhatsApp prefill text. Edit the
       strings to match how YOU talk (casual, formal, slang, etc.).
     • Product titles & descriptions live in the Sheet, not here.

   Optional: search for buildPrefill() if you want more advanced message logic.
   ============================================================================= */

/**
 * Google Sheet — File → Share → Publish to web → CSV → Publish, then paste the URL here.
 *
 * IMPORTANT: Link must export CSV (`…/pub?…output=csv`). Copying “Link” from the Publish
 * dialog often yields `pubhtml` (a web preview) — that will NOT load the catalogue.
 *
 * Typical format:
 * https://docs.google.com/spreadsheets/d/e/YOUR_PUBLISH_ID/pub?gid=0&single=true&output=csv
 */
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7o-SnNnXkzb9_xsCVbNvMi_-AGpTnsUa93E5ERc-xfs0oYXCckp0n-BiQo5eFdyW61y_U5vxqlOad/pub?gid=0&single=true&output=csv";

/** Owner’s WhatsApp (digits only, no +). DO NOT change or “reset” this — keep 254746881264. */
const WA_NUMBER = "254746881264";

/**
 * How you greet customers in the WhatsApp draft — this IS your “personality” online.
 * Tweak wording anytime; keep ${} placeholders out (this file uses plain strings).
 */
const BRAND_NAME = "TrimDrop KE";

/**
 * M-PESA — manual Lipa Na M-PESA (customer pays on phone; sends you confirmation code).
 * paybill = Pay Bill + business number + account | till = Buy Goods & Services + till number.
 */
const MPESA_PAYMENT_MODE = "paybill";

/** Shown on the payment screen — override blank to use BRAND_NAME */
const MPESA_BUSINESS_DISPLAY_NAME = "";

/** Pay Bill business number — digits only (you add later) */
const MPESA_PAYBILL_NUMBER = "";

/** Pay Bill account ref the customer enters under “Account No.” */
const MPESA_ACCOUNT_NUMBER = "";

/** Till number — digits only — use when MPESA_PAYMENT_MODE is "till" */
const MPESA_TILL_NUMBER = "";

function mpesaMerchantLabel() {
  return (MPESA_BUSINESS_DISPLAY_NAME || "").trim() || BRAND_NAME;
}

const BRAND_VOICE = {
  /** First line of the prefilled message */
  opener: "Hi — I’m trying to cop from",

  /** Label before Pickup vs Bolt (printed on its own line) */
  deliveryLead: "How you want it",

  pickupName: "Pickup Mtaani",
  boltName: "Bolt / doorstep",

  /** Shown when someone orders from a specific product card */
  pieceLead: "Piece",

  /** Trailing sign-off (emoji or short line — your vibe) */
  outro: "🛍",
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
 *   name, category, price, old_price, badge, image_url, available, featured, sku
 *
 *   Product photo: put a plain https://… link in the cell (recommended: CDN e.g.
 *   Cloudinary). An inserted “image” or =IMAGE(...) may show in Sheets but publish
 *   as empty CSV — the site only sees text in the CSV export.
 *
 *   category → must match a filter chip: Tees | Bottoms | Outerwear | Footwear | Accessories
 *   badge → new | hot | empty
 *   featured → optional yes/true (if badge blank, badge shows as New)
 *   available → yes/true to publish the row on the site
 */

let allProducts = [];
let currentFilter = "All";
let selectedProductLine = "";

const CART_STORAGE_KEY = "trimdrop_cart_v1";
const LIKES_STORAGE_KEY = "trimdrop_likes_v1";

/** @type {{ key: string, name: string, price_numeric: number, price_display: string, qty: number }[]} */
let cartLines = [];

/** Product quick-view (lightbox) — `productCartKey` when open */
let activeLightboxKey = "";

/* -----------------------------------------------------------------------------
   BOOT
   --------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initTickerXray();
  initFilters();
  initCategoryTiles();
  initCategoryTileBackgrounds();
  initProductLightbox();
  initCartAndCheckout();
  initModal();
  initNavOrders();
  loadPersistedCart();
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

/** Turn common “published web” URLs into a CSV fetch URL (fixes pubhtml vs pub). */
function resolveSheetCsvUrl(url) {
  const t = String(url ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    if (!u.hostname.includes("google.com") || !u.pathname.includes("/spreadsheets/")) {
      return t;
    }
    if (/\/pubhtml\/?$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/pubhtml\/?$/i, "/pub");
    }
    u.searchParams.set("output", "csv");
    return u.href;
  } catch {
    return t;
  }
}

async function loadInventory() {
  const hint = document.getElementById("productsHint");

  const applyFallback = (msg) => {
    allProducts = normalizeRows(FALLBACK_PRODUCTS);
    pruneCartAgainstCatalogue();
    if (hint) hint.textContent = msg;
    applyFilter();
  };

  const resolved = resolveSheetCsvUrl(SHEET_URL);
  if (!resolved) {
    applyFallback("Set SHEET_URL in app.js to your Published CSV URL — showing fallback samples.");
    return;
  }

  if (hint) hint.textContent = "Loading catalogue…";

  try {
    const res = await fetch(resolved, {
      credentials: "omit",
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`CSV fetch HTTP ${res.status}`);
    }
    let csvText = await res.text();
    if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1);
    if (!csvText.trim()) throw new Error("Empty CSV body");

    const head = csvText.trimStart().slice(0, 800).toLowerCase();
    if (
      head.startsWith("<!doctype") ||
      head.startsWith("<html") ||
      (head.startsWith("<") && head.includes("<html"))
    ) {
      throw new Error(
        'Sheet URL returned a web page instead of CSV. Use File → Share → Publish to web → format "CSV" — the link must include output=csv (not pubhtml).'
      );
    }

    const parsed = parseCSV(csvText).map(normalizeCsvRow).filter(isAvailableRow);

    if (parsed.length === 0) {
      applyFallback(
        "Sheet had no available rows (need available=yes and a name) — fallback samples."
      );
      return;
    }

    allProducts = parsed;
    pruneCartAgainstCatalogue();
    if (hint) {
      hint.textContent = `${parsed.length} piece${parsed.length !== 1 ? "s" : ""} from your sheet.`;
    }
    applyFilter();
  } catch (e) {
    console.warn("loadInventory", e);
    const msg =
      e && String(e.message || "").includes("web page instead of CSV")
        ? e.message + " Showing fallback samples."
        : e && String(e.message || "").includes("HTTP")
          ? `CSV request failed (${e.message}). Check the published link. Showing fallback samples.`
          : "Could not load CSV (link, network, or sheet columns). Showing fallback samples.";
    applyFallback(msg);
  }
}

function pickCell(row, keys) {
  for (const key of keys) {
    const k = key.toLowerCase().replace(/\s+/g, "_");
    if (
      row[k] !== undefined &&
      row[k] !== null &&
      String(row[k]).trim() !== ""
    ) {
      return String(row[k]).trim();
    }
  }
  return "";
}

/** First https? URL in a cell (handles messy paste, stray quotes, etc.) */
function coerceImageUrl(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/\uFEFF/g, "");
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const smart = s.replace(/[\u201C\u201D\u2018\u2019]/g, '"');
  if (smart !== s) s = smart;

  const m = s.match(/https?:\/\/[^\s"',)\]\u00A0]+/i);
  if (m) s = m[0];
  s = s.replace(/[)\].,;:]+$/g, "");

  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol)) return "";
    let href = u.href;

    if (u.hostname.includes("drive.google.com")) {
      const fileId = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileId) {
        href = `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
      } else if (u.pathname.includes("/open")) {
        const id = u.searchParams.get("id");
        if (id) href = `https://drive.google.com/uc?export=view&id=${id}`;
      }
    }
    return href;
  } catch {
    return "";
  }
}

const IMAGE_HEADER_HINT = /(image|photo|pic|thumb|cover|hero|banner|cdn|asset|media|url|link)/i;

function pickImageUrl(row) {
  const primary = pickCell(row, [
    "image_url",
    "image",
    "photo",
    "photo_url",
    "picture",
    "photo_link",
    "item_cover",
    "item_cover_url",
    "cover",
    "cover_url",
    "cover_image",
    "thumbnail",
    "thumb",
    "thumb_url",
    "product_image",
    "main_image",
    "hero_image",
  ]);

  let url = coerceImageUrl(primary);
  if (url) return url;

  for (const [k, val] of Object.entries(row)) {
    if (!IMAGE_HEADER_HINT.test(k)) continue;
    if (typeof val !== "string" || !val.trim()) continue;
    if (/^price|^old_price|numeric|display|available|featured|badge|sku/i.test(k)) continue;
    url = coerceImageUrl(val);
    if (url) return url;
  }
  return "";
}

function normalizeCsvRow(row) {
  const name =
    pickCell(row, ["name", "product_name", "product", "item", "title", "piece"]) || "";

  let priceNum =
    typeof row.price_numeric === "number" && !Number.isNaN(row.price_numeric)
      ? row.price_numeric
      : 0;

  if (!priceNum) {
    const raw = pickCell(row, ["price", "price_kes", "cost", "ksh", "amount"]).replace(/[^\d.-]/g, "");
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) priceNum = n;
  }

  const oldPick = pickCell(row, ["old_price", "was", "compare_at", "compare_price", "msrp"]);

  let oldNum = row.old_price;
  if (oldNum === undefined && row.old_price_numeric !== undefined)
    oldNum = row.old_price_numeric;
  if (typeof oldNum === "string") oldNum = parseFloat(oldNum.replace(/[^\d.-]/g, "")) || 0;
  if (typeof oldNum !== "number") oldNum = parseFloat(oldNum) || 0;
  if (oldPick) {
    const o = parseFloat(oldPick.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(o)) oldNum = o;
  }

  const category = pickCell(row, ["category", "type", "cat", "collection"]);
  const image_url = pickImageUrl(row);
  const sku = pickCell(row, ["sku", "sku_code", "id", "item_id", "product_id"]);

  let availableRaw = "";
  if (row.available !== undefined && row.available !== null && String(row.available).trim() !== "") {
    availableRaw = String(row.available).trim();
  }
  if (!availableRaw)
    availableRaw = pickCell(row, ["available", "in_stock", "stock", "active"]);
  const available = availableRaw || "yes";

  let badge = String(pickCell(row, ["badge", "tag", "label"]) || row.badge || "")
    .toLowerCase()
    .trim();

  let featuredRaw = pickCell(row, ["featured", "is_featured", "feature"]);
  if (!featuredRaw && row.featured !== undefined && row.featured !== null) {
    featuredRaw = String(row.featured).trim();
  }
  const featured = String(featuredRaw).toLowerCase().trim();

  let price_display = row.price_display ? String(row.price_display) : "";
  if (!price_display && priceNum) price_display = formatKsh(priceNum);

  if (!badge && (featured === "yes" || featured === "true")) badge = "new";

  return {
    sku,
    name,
    category: capitalizeWord(category),
    price_display: price_display || formatKsh(priceNum),
    price_numeric: priceNum,
    old_price_numeric: oldNum,
    badge,
    image_url,
    available,
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

function normalizeCsvHeader(cell) {
  let s = String(cell ?? "").trim();
  if (!s.length) return "";
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/^"+|"+$/g, "");
  return s.replace(/\s+/g, "_").toLowerCase();
}

function parseCSV(text) {
  let t = typeof text === "string" ? text : "";
  if (!t.trim()) return [];
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const rawLines = t.split("\n");
  const lines = rawLines.map((ln) => ln.trim()).filter((ln) => ln.length > 0);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeCsvHeader).filter((h) => h.length > 0);
  if (!headers.length) return [];

  const PRICE_HEADERS = new Set(["price", "price_kes", "cost", "ksh", "amount"]);
  const OLD_HEADERS = new Set(["old_price", "was", "compare_at", "compare_price", "msrp"]);

  return lines.slice(1).map((line) => {
    const vals = splitCsvLine(line);

    /** @type {Record<string,string|number|undefined>} */
    const row = {};
    headers.forEach((h, i) => {
      let v = (vals[i] || "").trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      row[h] = v;

      if (PRICE_HEADERS.has(h)) {
        const rawStr = String(v).replace(/[^\d.-]/g, "");
        const num = parseFloat(rawStr);
        row.price_numeric = Number.isNaN(num) ? 0 : num;
        if (!Number.isNaN(num) && rawStr !== "") {
          row.price_display =
            "KSH " + Math.round(num).toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
      }
      if (OLD_HEADERS.has(h)) {
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

/** “Shop the drop” tile photos — set data-bg="https://…jpg" on each a.cat-item (see index.html). */
function initCategoryTileBackgrounds() {
  document.querySelectorAll("a.cat-item[data-bg]").forEach((link) => {
    const raw = (link.getAttribute("data-bg") || "").trim();
    if (!raw) return;
    const quoted = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    link.style.setProperty("--cat-image", `url("${quoted}")`);
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

  grid.querySelectorAll(".product-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const key = btn.getAttribute("data-cart-key");
      if (!key) return;
      const p = findProductByKey(key);
      if (p) addProductToCart(p);
    });
  });

  grid.querySelectorAll(".product-img-wrap").forEach((wrap) => {
    wrap.addEventListener("click", (e) => {
      if (e.target.closest(".product-quick")) return;
      const card = wrap.closest("[data-cart-key]");
      const key = card?.getAttribute("data-cart-key");
      if (key) openProductLightbox(key);
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

function productCartKey(p) {
  const sku = String(p.sku || "").trim();
  if (sku) return sku;
  const slug = String(p.name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return `${slug}-${Number(p.price_numeric) || 0}`;
}

function findProductByKey(key) {
  return allProducts.find((p) => productCartKey(p) === key);
}

function getLikedKeySet() {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter(Boolean).map(String) : []);
  } catch {
    return new Set();
  }
}

function saveLikedKeySet(set) {
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...set]));
  } catch (_) {
    /** ignore */
  }
}

function syncLightboxLikeUi() {
  const btn = document.getElementById("lightboxLikeBtn");
  if (!btn) return;
  const on = Boolean(activeLightboxKey && getLikedKeySet().has(activeLightboxKey));
  btn.classList.toggle("is-liked", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}

function toggleLikedActiveProduct() {
  if (!activeLightboxKey) return;
  const set = getLikedKeySet();
  if (set.has(activeLightboxKey)) set.delete(activeLightboxKey);
  else set.add(activeLightboxKey);
  saveLikedKeySet(set);
  syncLightboxLikeUi();
}

function openWhatsAppForPieceName(productName) {
  const radio = document.querySelector('input[name="delivery"]:checked');
  const method =
    radio && radio.value === "bolt" ? BRAND_VOICE.boltName : BRAND_VOICE.pickupName;

  let body = `${BRAND_VOICE.opener} ${BRAND_NAME}.

${BRAND_VOICE.deliveryLead}: ${method}`;

  const name = (productName || "").trim();
  if (name) body += `\n\n${BRAND_VOICE.pieceLead}: ${name}`;
  body += `\n\n${BRAND_VOICE.outro}`;

  window.open(waUrl(body), "_blank", "noopener,noreferrer");
}

function openProductLightbox(productKey) {
  const p = findProductByKey(productKey);
  if (!p) return;

  const lb = document.getElementById("productLightbox");
  const mount = document.getElementById("lightboxMediaMount");
  const titleEl = document.getElementById("lightboxTitle");
  const priceEl = document.getElementById("lightboxPrice");
  const badgeSlot = document.getElementById("lightboxBadgeSlot");
  if (!lb || !mount || !titleEl || !priceEl || !badgeSlot) return;

  activeLightboxKey = productKey;
  titleEl.textContent = p.name || "Piece";

  let priceHtml = escapeHtml(p.price_display || "");
  const oldNum = Number(p.old_price_numeric) || 0;
  const curNum = Number(p.price_numeric) || 0;
  if (oldNum > curNum && oldNum > 0) {
    priceHtml += ` <span class="product-lightbox-old">${escapeHtml(
      "KSH " + oldNum.toLocaleString()
    )}</span>`;
  }
  priceEl.innerHTML = priceHtml;

  const badgeMarkup = badgeHtml(p.badge);
  badgeSlot.innerHTML = badgeMarkup;
  badgeSlot.hidden = !badgeMarkup;

  const img = (p.image_url || "").trim();
  const initial = escapeHtml((p.name || "?").slice(0, 1).toUpperCase());
  if (img) {
    mount.innerHTML = `<img src="${escapeAttr(img)}" alt="${escapeAttr(
      p.name
    )}" class="product-lightbox-img" decoding="async"/>`;
  } else {
    mount.innerHTML = `<div class="product-lightbox-placeholder">${initial}</div>`;
  }

  syncLightboxLikeUi();
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
  refreshOverlayScrollLock();
}

function closeProductLightbox() {
  const lb = document.getElementById("productLightbox");
  if (!lb?.classList.contains("open")) return;
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
  activeLightboxKey = "";
  refreshOverlayScrollLock();
}

function initProductLightbox() {
  document.getElementById("productLightboxClose")?.addEventListener("click", closeProductLightbox);
  document.getElementById("productLightbox")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeProductLightbox();
  });

  document.getElementById("lightboxLikeBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLikedActiveProduct();
  });

  document.getElementById("lightboxAddBtn")?.addEventListener("click", () => {
    const p = findProductByKey(activeLightboxKey);
    if (!p) return;
    addProductToCart(p);
    closeProductLightbox();
  });

  document.getElementById("lightboxDmBtn")?.addEventListener("click", () => {
    const p = findProductByKey(activeLightboxKey);
    openWhatsAppForPieceName(p?.name || "");
    closeProductLightbox();
  });
}

function productCardHtml(p, index) {
  const ck = escapeAttr(productCartKey(p));
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
    <article class="product-card product-card--entered" data-cart-key="${ck}" style="animation-delay:${delay}s">
      <div class="product-img-wrap">
        ${mediaHtml}
        ${badgeHtml(p.badge)}
        <button type="button" class="product-quick" data-name="${escapeAttr(p.name)}">DM on WhatsApp</button>
      </div>
      <div class="product-info">
        <div class="product-name">${escapeHtml(p.name)}</div>
        ${priceInner}
        <button type="button" class="product-add" data-cart-key="${ck}" aria-label="Add ${escapeAttr(
          p.name
        )} to bag">Add to bag</button>
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
  refreshOverlayScrollLock();

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
  refreshOverlayScrollLock();
}

/* -----------------------------------------------------------------------------
   Cart + Lipa Na M-PESA checkout
   --------------------------------------------------------------------------- */

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartLines));
  } catch (_) {
    /** ignore quota / privacy mode */
  }
}

function pruneCartAgainstCatalogue() {
  const next = [];
  for (const line of cartLines) {
    const p = findProductByKey(line.key);
    if (!p) continue;
    next.push({
      key: line.key,
      name: p.name,
      price_numeric: Number(p.price_numeric) || 0,
      price_display: p.price_display || formatKsh(p.price_numeric),
      qty: line.qty,
    });
  }
  cartLines = next;
  persistCart();
  syncCartBadgeUI();
  renderCartDrawer();
}

function loadPersistedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    cartLines = parsed
      .filter((x) => x && x.key && x.name)
      .map((x) => ({
        key: String(x.key),
        name: String(x.name),
        price_numeric: Number(x.price_numeric) || 0,
        price_display: String(x.price_display || formatKsh(x.price_numeric)),
        qty: Math.max(1, Math.min(99, Number(x.qty) || 1)),
      }));
  } catch (_) {
    cartLines = [];
  }
  syncCartBadgeUI();
  renderCartDrawer();
}

function cartLineTotal(line) {
  return (Number(line.price_numeric) || 0) * (Number(line.qty) || 1);
}

function cartGrandTotal() {
  return cartLines.reduce((sum, l) => sum + cartLineTotal(l), 0);
}

function cartItemCount() {
  return cartLines.reduce((n, l) => n + (Number(l.qty) || 1), 0);
}

function syncCartBadgeUI() {
  const badge = document.getElementById("cartCountBadge");
  const n = cartItemCount();
  if (!badge) return;
  if (n < 1) {
    badge.hidden = true;
    badge.textContent = "";
  } else {
    badge.hidden = false;
    badge.textContent = String(n);
  }
}

function addProductToCart(p) {
  const key = productCartKey(p);
  const existing = cartLines.find((l) => l.key === key);
  if (existing) {
    existing.qty = Math.min(99, (existing.qty || 1) + 1);
    existing.price_numeric = Number(p.price_numeric) || 0;
    existing.price_display = p.price_display || formatKsh(p.price_numeric);
    existing.name = p.name;
  } else {
    cartLines.push({
      key,
      name: p.name,
      price_numeric: Number(p.price_numeric) || 0,
      price_display: p.price_display || formatKsh(p.price_numeric),
      qty: 1,
    });
  }
  persistCart();
  syncCartBadgeUI();
  renderCartDrawer();
}

function refreshOverlayScrollLock() {
  const orderOpen = document.getElementById("orderModal")?.classList.contains("open");
  const payOpen = document.getElementById("checkoutModal")?.classList.contains("open");
  const cartOpen =
    document.getElementById("cartDrawerBackdrop")?.classList.contains("open") || false;
  const lightboxOpen =
    document.getElementById("productLightbox")?.classList.contains("open") || false;
  document.body.style.overflow =
    orderOpen || payOpen || cartOpen || lightboxOpen ? "hidden" : "";
}

function mpesaGroupedDigits(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function renderMpesaInstructions(totalNum) {
  const stepsEl = document.getElementById("checkoutMpesaSteps");
  const warnEl = document.getElementById("checkoutMpesaWarn");
  if (!stepsEl) return;

  const totalLabel = formatKsh(totalNum);
  const mode = (MPESA_PAYMENT_MODE || "paybill").toLowerCase() === "till" ? "till" : "paybill";
  let missing = "";

  let html = "";
  if (mode === "paybill") {
    const pb = mpesaGroupedDigits(MPESA_PAYBILL_NUMBER);
    const ac = (MPESA_ACCOUNT_NUMBER || "").trim();
    if (!MPESA_PAYBILL_NUMBER.trim() || !ac) {
      missing = "Add MPESA_PAYBILL_NUMBER and MPESA_ACCOUNT_NUMBER in app.js so customers see the right numbers.";
    }
    html = `
      <ol class="mpesa-steps">
        <li>Open M-PESA → <strong>Lipa na M-PESA</strong> → <strong>Pay Bill</strong>.</li>
        <li>Business number: <strong>${escapeHtml(pb || "— configure in app.js —")}</strong></li>
        <li>Account number: <strong>${escapeHtml(ac || "—")}</strong></li>
        <li>Amount: <strong>${escapeHtml(totalLabel)}</strong> exactly (don’t round up or down).</li>
        <li>Enter your M-PESA PIN → confirm → copy the SMS confirmation code below.</li>
      </ol>
      <p class="mpesa-merchant">${escapeHtml(mpesaMerchantLabel())}</p>
    `;
  } else {
    const till = mpesaGroupedDigits(MPESA_TILL_NUMBER);
    if (!MPESA_TILL_NUMBER.trim()) missing = "Add MPESA_TILL_NUMBER in app.js for Till checkout.";
    html = `
      <ol class="mpesa-steps">
        <li>Open M-PESA → <strong>Lipa na M-PESA</strong> → <strong>Buy Goods and Services</strong>.</li>
        <li>Till No.: <strong>${escapeHtml(till || "— configure in app.js —")}</strong></li>
        <li>Amount: <strong>${escapeHtml(totalLabel)}</strong> exactly.</li>
        <li>PIN → confirm → paste the M-PESA confirmation / transaction code below.</li>
      </ol>
      <p class="mpesa-merchant">${escapeHtml(mpesaMerchantLabel())}</p>
    `;
  }

  stepsEl.innerHTML = html;
  if (warnEl) {
    warnEl.hidden = !missing;
    warnEl.textContent = missing;
  }
}

function buildCartWhatsAppBody(mpesaRef) {
  const radio = document.querySelector('input[name="checkout-delivery"]:checked');
  const method =
    radio && radio.value === "bolt" ? BRAND_VOICE.boltName : BRAND_VOICE.pickupName;

  const lines = cartLines
    .map(
      (l) =>
        `• ${l.qty}× ${l.name} — ${l.price_display} each = ${formatKsh(cartLineTotal(l))}`
    )
    .join("\n");

  return `${BRAND_VOICE.opener} ${BRAND_NAME}.

${BRAND_VOICE.deliveryLead}: ${method}

Order (bag):
${lines}

Total: ${formatKsh(cartGrandTotal())}

M-PESA confirmation: ${mpesaRef}

${BRAND_VOICE.outro}`;
}

function renderCartDrawer() {
  const listEl = document.getElementById("cartLines");
  const emptyEl = document.getElementById("cartEmpty");
  const subEl = document.getElementById("cartSubtotal");
  const btn = document.getElementById("cartCheckoutBtn");
  if (!listEl || !emptyEl) return;

  if (!cartLines.length) {
    listEl.innerHTML = "";
    emptyEl.hidden = false;
    if (subEl) subEl.textContent = "";
    if (btn) btn.disabled = true;
    return;
  }

  emptyEl.hidden = true;
  if (btn) btn.disabled = false;
  if (subEl) subEl.textContent = `Total ${formatKsh(cartGrandTotal())}`;

  listEl.innerHTML = cartLines
    .map(
      (l) => `
    <div class="cart-line" data-key="${escapeAttr(l.key)}">
      <div class="cart-line-main">
        <div class="cart-line-name">${escapeHtml(l.name)}</div>
        <div class="cart-line-meta">${escapeHtml(l.price_display)} each</div>
      </div>
      <div class="cart-line-actions">
        <button type="button" class="cart-qty" data-act="dec" aria-label="Decrease">−</button>
        <span class="cart-qty-val">${l.qty}</span>
        <button type="button" class="cart-qty" data-act="inc" aria-label="Increase">+</button>
        <button type="button" class="cart-remove" data-act="remove" aria-label="Remove">Remove</button>
      </div>
    </div>
  `
    )
    .join("");
}

function openCartDrawer() {
  document.getElementById("cartDrawerBackdrop")?.classList.add("open");
  const d = document.getElementById("cartDrawer");
  if (!d) return;
  renderCartDrawer();
  d.classList.add("open");
  d.setAttribute("aria-hidden", "false");
  document.getElementById("cartDrawerBackdrop")?.setAttribute("aria-hidden", "false");
  document.getElementById("cartToggleBtn")?.setAttribute("aria-expanded", "true");
  refreshOverlayScrollLock();
}

function closeCartDrawer() {
  document.getElementById("cartDrawerBackdrop")?.classList.remove("open");
  document.getElementById("cartDrawerBackdrop")?.setAttribute("aria-hidden", "true");
  const d = document.getElementById("cartDrawer");
  if (!d) return;
  d.classList.remove("open");
  d.setAttribute("aria-hidden", "true");
  document.getElementById("cartToggleBtn")?.setAttribute("aria-expanded", "false");
  refreshOverlayScrollLock();
}

function openCheckoutModal() {
  const total = cartGrandTotal();
  if (total <= 0 || !cartLines.length) return;

  const m = document.getElementById("checkoutModal");
  const totalStrip = document.getElementById("checkoutTotalStrip");
  const refInput = document.getElementById("checkoutMpesaRef");
  closeCartDrawer();
  if (refInput) refInput.value = "";
  if (totalStrip) {
    totalStrip.textContent = `Pay exactly ${formatKsh(total)}`;
  }
  renderMpesaInstructions(total);
  if (!m) return;
  m.classList.add("open");
  m.setAttribute("aria-hidden", "false");
  refreshOverlayScrollLock();
}

function closeCheckoutModal() {
  const m = document.getElementById("checkoutModal");
  if (!m) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
  refreshOverlayScrollLock();
}

function initCartAndCheckout() {
  document.getElementById("cartToggleBtn")?.addEventListener("click", () => {
    const d = document.getElementById("cartDrawer");
    if (d?.classList.contains("open")) closeCartDrawer();
    else openCartDrawer();
  });

  document.getElementById("cartDrawerBackdrop")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cartDrawerClose")?.addEventListener("click", closeCartDrawer);

  document.getElementById("cartLines")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const lineEl = btn.closest(".cart-line");
    const key = lineEl?.getAttribute("data-key");
    if (!key) return;
    const act = btn.getAttribute("data-act");
    const line = cartLines.find((l) => l.key === key);
    if (!line) return;

    if (act === "inc") line.qty = Math.min(99, (line.qty || 1) + 1);
    if (act === "dec") line.qty = Math.max(1, (line.qty || 1) - 1);
    if (act === "remove") cartLines = cartLines.filter((l) => l.key !== key);

    persistCart();
    syncCartBadgeUI();
    renderCartDrawer();
  });

  document.getElementById("cartCheckoutBtn")?.addEventListener("click", () => {
    if (cartGrandTotal() <= 0) return;
    openCheckoutModal();
  });

  document.getElementById("checkoutModalClose")?.addEventListener("click", closeCheckoutModal);
  document.getElementById("checkoutModal")?.addEventListener("click", (e) => {
    if (e.target.id === "checkoutModal") closeCheckoutModal();
  });

  document.getElementById("checkoutWaBtn")?.addEventListener("click", () => {
    const refInput = document.getElementById("checkoutMpesaRef");
    const ref = (refInput?.value || "").trim();
    if (ref.length < 4) {
      refInput?.focus();
      refInput?.classList.add("checkout-input--error");
      return;
    }
    refInput?.classList.remove("checkout-input--error");
    const url = waUrl(buildCartWhatsAppBody(ref));
    window.open(url, "_blank", "noopener,noreferrer");
  });

  document.getElementById("checkoutMpesaRef")?.addEventListener("input", (e) => {
    e.target.classList.remove("checkout-input--error");
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.getElementById("checkoutModal")?.classList.contains("open")) {
    closeCheckoutModal();
    return;
  }
  if (document.getElementById("cartDrawerBackdrop")?.classList.contains("open")) {
    closeCartDrawer();
    return;
  }
  if (document.getElementById("productLightbox")?.classList.contains("open")) {
    closeProductLightbox();
    return;
  }
  closeOrder();
});
