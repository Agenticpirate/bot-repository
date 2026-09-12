(() => {
  const grid = document.getElementById("grid");
  const featuredEl = document.getElementById("featured");
  const chipsEl = document.getElementById("chips");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty");
  const heroCountEl = document.getElementById("hero-count");

  const FEATURED_IDS = ["grok-bot", "muse", "instinct", "town", "poke"];

  const FIXED_CHIPS = [
    "All",
    "Latest",
    "personal-assistant",
    "other",
  ];

  const CHIP_LABELS = {
    All: "All",
    Latest: "Latest",
    "personal-assistant": "Personal assistant",
    research: "Research",
    coding: "Coding",
    shopping: "Shopping",
    browser: "Browser",
    enterprise: "Enterprise",
    other: "Other",
  };

  let agents = [];
  let activeFilter = "All";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function categoryLabel(cat) {
    return CHIP_LABELS[cat] || String(cat || "").replace(/-/g, " ");
  }

  function launchLine(a) {
    if (!a.launched) return "";
    const label = escapeHtml(a.launched);
    const href = a.launchUrl || a.techcrunchUrl;
    if (href) {
      return `<a class="launch-link" href="${escapeHtml(
        href
      )}" target="_blank" rel="noopener noreferrer">${label} →</a>`;
    }
    return `<span class="launch-muted">${label}</span>`;
  }

  function raisedLine(a) {
    if (!a.raised) return "";
    return `<span class="raised-muted">${escapeHtml(a.raised)}</span>`;
  }

  function metaBlock(a) {
    const launch = launchLine(a);
    const raised = raisedLine(a);
    if (!launch && !raised) return "";
    const parts = [];
    if (launch) parts.push(launch);
    if (raised) parts.push(raised);
    return `<div class="card-meta">${parts.join('<span class="meta-sep" aria-hidden="true">·</span>')}</div>`;
  }

  const MONTHS = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  function launchSortKey(launched) {
    if (!launched) return null;
    const parts = String(launched).trim().split(/\s+/);
    if (parts.length < 2) return null;
    const month = MONTHS[parts[0].toLowerCase()];
    const year = parseInt(parts[1], 10);
    if (month == null || Number.isNaN(year)) return null;
    return year * 12 + month;
  }

  function sortAgents(list) {
    return [...list].sort((a, b) => {
      const ak = launchSortKey(a.launched);
      const bk = launchSortKey(b.launched);
      if (ak != null && bk != null && ak !== bk) return bk - ak;
      if (ak != null && bk == null) return -1;
      if (ak == null && bk != null) return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function addedSortKey(a) {
    if (a.addedAt) return String(a.addedAt);
    const k = launchSortKey(a.launched);
    if (k == null) return "";
    const year = Math.floor(k / 12);
    const month = (k % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }

  function sortLatest(list) {
    return [...list].sort((a, b) => {
      const ak = addedSortKey(a);
      const bk = addedSortKey(b);
      if (ak && bk && ak !== bk) return bk.localeCompare(ak);
      if (ak && !bk) return -1;
      if (!ak && bk) return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function filtered() {
    let list;
    if (activeFilter === "All") {
      list = agents;
      return sortAgents(list);
    }
    if (activeFilter === "Latest") {
      // Recently added to Agenthunt (addedAt), else recent launches
      const withAdded = agents.filter((a) => a.addedAt);
      list = withAdded.length ? withAdded : agents;
      return sortLatest(list);
    }
    list = agents.filter((a) => a.category === activeFilter);
    return sortAgents(list);
  }

  function renderChips() {
    chipsEl.innerHTML = FIXED_CHIPS.map((key) => {
      const label = CHIP_LABELS[key] || key;
      const active = key === activeFilter;
      return `<button type="button" class="chip${active ? " active" : ""}" data-filter="${escapeHtml(
        key
      )}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
    }).join("");
  }

  function padNum(n) {
    return String(n).padStart(2, "0");
  }

  function featuredCard(a, index) {
    const meta = metaBlock(a);
    const visit = a.url
      ? `<a class="card-link" href="${escapeHtml(
          a.url
        )}" target="_blank" rel="noopener noreferrer">Visit →</a>`
      : "";
    const title = a.url
      ? `<h3><a class="card-title-link" href="${escapeHtml(
          a.url
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name || "")}</a></h3>`
      : `<h3>${escapeHtml(a.name || "")}</h3>`;
    return `<article class="featured-card">
      <div class="featured-card-top">
        <span class="featured-num">${padNum(index + 1)}</span>
        <span class="badge badge-category">${escapeHtml(categoryLabel(a.category))}</span>
      </div>
      ${title}
      <p class="card-blurb">${escapeHtml(a.oneLiner || "")}</p>
      ${meta}
      ${visit}
    </article>`;
  }

  function gridCard(a) {
    const meta = metaBlock(a);
    const visit = a.url
      ? `<a class="card-link" href="${escapeHtml(
          a.url
        )}" target="_blank" rel="noopener noreferrer">Visit →</a>`
      : "";
    const title = a.url
      ? `<h2><a class="card-title-link" href="${escapeHtml(
          a.url
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name || "")}</a></h2>`
      : `<h2>${escapeHtml(a.name || "")}</h2>`;
    return `<article class="card">
      <div class="card-top">
        <span class="badge badge-category">${escapeHtml(categoryLabel(a.category))}</span>
      </div>
      ${title}
      <p class="card-blurb">${escapeHtml(a.oneLiner || "")}</p>
      ${meta}
      ${visit}
    </article>`;
  }

  function renderFeatured() {
    if (!featuredEl) return;
    const byId = new Map(agents.map((a) => [a.id, a]));
    const items = FEATURED_IDS.map((id) => byId.get(id)).filter(Boolean);
    featuredEl.innerHTML = items.map((a, i) => featuredCard(a, i)).join("");
  }

  function renderCards() {
    const items = filtered();
    countEl.textContent = `${items.length} agent${items.length === 1 ? "" : "s"}`;
    emptyEl.classList.toggle("hidden", items.length > 0);
    grid.innerHTML = items.map(gridCard).join("");
  }

  chipsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    renderChips();
    renderCards();
  });

  /* —— Pixel block wordmark / shuffle —— */
  // 5x7 lowercase glyphs (1 = block). Rows top→bottom.
  const GLYPHS = {
    a: ["01110","10001","10001","11111","10001","10001","10001"],
    b: ["11110","10001","10001","11110","10001","10001","11110"],
    c: ["01111","10000","10000","10000","10000","10000","01111"],
    d: ["11110","10001","10001","10001","10001","10001","11110"],
    e: ["11111","10000","10000","11110","10000","10000","11111"],
    f: ["11111","10000","10000","11110","10000","10000","10000"],
    g: ["01111","10000","10000","10111","10001","10001","01110"],
    h: ["10001","10001","10001","11111","10001","10001","10001"],
    i: ["11111","00100","00100","00100","00100","00100","11111"],
    j: ["00111","00010","00010","00010","00010","10010","01100"],
    k: ["10001","10010","10100","11000","10100","10010","10001"],
    l: ["10000","10000","10000","10000","10000","10000","11111"],
    m: ["10001","11011","10101","10001","10001","10001","10001"],
    n: ["10001","11001","10101","10011","10001","10001","10001"],
    o: ["01110","10001","10001","10001","10001","10001","01110"],
    p: ["11110","10001","10001","11110","10000","10000","10000"],
    q: ["01110","10001","10001","10001","10101","10010","01101"],
    r: ["11110","10001","10001","11110","10100","10010","10001"],
    s: ["01111","10000","10000","01110","00001","00001","11110"],
    t: ["11111","00100","00100","00100","00100","00100","00100"],
    u: ["10001","10001","10001","10001","10001","10001","01110"],
    v: ["10001","10001","10001","10001","10001","01010","00100"],
    w: ["10001","10001","10001","10001","10101","11011","10001"],
    x: ["10001","10001","01010","00100","01010","10001","10001"],
    y: ["10001","10001","01010","00100","00100","00100","00100"],
    z: ["11111","00001","00010","00100","01000","10000","11111"],
  };

  // Ink + citrus block palette — chalk/amber/teal/coral heavy (ink muted for contrast)
  const COLORS = ["c-chalk", "c-amber", "c-teal", "c-ink", "c-coral"];
  const COLOR_WEIGHTS = [0.34, 0.3, 0.2, 0.04, 0.12];

  // Directory product names (beyond featured) — short tokens that fit the glyph grid
  const SHUFFLE_WORDS = [
    "wis",
    "moldable",
    "muse", "poke", "town", "grok", "instinct",
    "soar", "tomo", "caddy", "catch", "boba", "folk", "pally", "ollie",
    "orchid", "vellum", "slashy", "miso", "lucas", "zapia", "joshu",
    "asmi", "migoo", "buoy", "mana", "waldo", "asaply", "letta", "boski", "figment", "mitra", "moya",
    "brea", "ezail", "flip", "sunny", "tab", "halo", "lindy", "rabbit",
    "szn", "shuffle", "wajo", "openclaw", "familiar", "today", "pneum",
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pickColor(rng) {
    let r = rng();
    for (let i = 0; i < COLORS.length; i++) {
      r -= COLOR_WEIGHTS[i];
      if (r <= 0) return COLORS[i];
    }
    return COLORS[0];
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashWord(word) {
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const blockWordEl = document.getElementById("block-word");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const shuffleLive = document.getElementById("shuffle-live");
  let currentWord = "muse";
  let shuffling = false;
  let autoTimer = null;
  const AUTO_MS = 3000;

  function maxShuffleLetters() {
    return Math.max(8, ...SHUFFLE_WORDS.map((w) => w.length));
  }

  function sizeWord(word) {
    if (!blockWordEl) return;
    // Always size for the longest pool word so the stage never reflows.
    const letters = maxShuffleLetters();
    const stage = blockWordEl.parentElement;
    const avail = (stage ? stage.clientWidth : blockWordEl.clientWidth) || window.innerWidth;
    const pad = 24;
    const letterGap = 4;
    const cellGap = 2;
    const units = letters * 5;
    const cell = Math.floor(
      (avail - pad - letterGap * (letters - 1) - cellGap * (units - letters)) / units
    );
    const clamped = Math.max(10, Math.min(14, cell));
    const gap = clamped >= 12 ? 2 : 1.5;
    const wordH = clamped * 7 + gap * 6 + 14;
    blockWordEl.style.setProperty("--cell", clamped + "px");
    blockWordEl.style.setProperty("--gap", gap + "px");
    blockWordEl.style.setProperty("--shuffle-word-h", wordH + "px");
    if (stage) {
      stage.style.setProperty("--shuffle-word-h", wordH + "px");
    }
    const currentLen = Math.max(1, String(word || currentWord || "").length);
    blockWordEl.classList.toggle("is-long", currentLen >= 7);
  }

  function buildWord(word, animateFrom) {
    if (!blockWordEl) return;
    sizeWord(word);
    const rng = mulberry32(hashWord(word) ^ 0x9e3779b9);
    const oldCells = animateFrom
      ? Array.from(blockWordEl.querySelectorAll(".block-cell:not(.is-empty)"))
      : [];

    blockWordEl.setAttribute("aria-label", word);
    blockWordEl.innerHTML = "";

    const letters = word.toLowerCase().split("");
    const newCells = [];

    letters.forEach((ch) => {
      const glyph = GLYPHS[ch];
      const letterEl = document.createElement("div");
      letterEl.className = "block-letter";
      letterEl.setAttribute("aria-hidden", "true");
      if (!glyph) {
        blockWordEl.appendChild(letterEl);
        return;
      }
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          const on = glyph[row][col] === "1";
          const cell = document.createElement("span");
          cell.className = "block-cell" + (on ? " " + pickColor(rng) : " is-empty");
          letterEl.appendChild(cell);
          if (on) newCells.push(cell);
        }
      }
      blockWordEl.appendChild(letterEl);
    });

    if (!animateFrom || reduceMotion || !oldCells.length) {
      return;
    }

    // Scatter old positions → assemble new
    const stage = blockWordEl.getBoundingClientRect();
    newCells.forEach((cell, i) => {
      const target = cell.getBoundingClientRect();
      const from = oldCells[i % oldCells.length].getBoundingClientRect();
      const dx = from.left - target.left;
      const dy = from.top - target.top;
      const scatterX = (rng() - 0.5) * Math.min(160, stage.width * 0.35);
      const scatterY = (rng() - 0.5) * 90 - 20;
      cell.style.transform = `translate(${dx}px, ${dy}px)`;
      cell.style.opacity = "0.85";
      cell.classList.add("is-scattering");
      requestAnimationFrame(() => {
        cell.style.transform = `translate(${scatterX}px, ${scatterY}px) rotate(${(rng() - 0.5) * 28}deg)`;
        cell.style.opacity = "0.55";
        setTimeout(() => {
          cell.classList.remove("is-scattering");
          cell.classList.add("is-assembling");
          cell.style.transform = "translate(0, 0) rotate(0deg)";
          cell.style.opacity = "1";
          setTimeout(() => {
            cell.classList.remove("is-assembling");
            cell.style.transform = "";
            cell.style.opacity = "";
          }, 560);
        }, 280 + (i % 7) * 12);
      });
    });
  }

  function setWord(word, { animate, updateHash } = {}) {
    const next = String(word || "muse").toLowerCase().replace(/[^a-z]/g, "").slice(0, 8) || "muse";
    const prev = currentWord;
    currentWord = next;
    buildWord(next, animate ? prev : null);
    if (shuffleLive) shuffleLive.textContent = `Word: ${next}`;
    if (updateHash !== false) {
      try {
        history.replaceState(null, "", `#${next}`);
      } catch (_) {}
    }
  }

  function nextShuffleWord() {
    const pool = SHUFFLE_WORDS.filter((w) => w !== currentWord);
    return pool[Math.floor(Math.random() * pool.length)] || "muse";
  }

  function onShuffle({ fromAuto } = {}) {
    if (shuffling || !shuffleBtn) return;
    shuffling = true;
    shuffleBtn.classList.add("is-busy");
    const word = nextShuffleWord();
    setWord(word, { animate: true, updateHash: true });
    const wait = reduceMotion ? 80 : 900;
    setTimeout(() => {
      shuffling = false;
      shuffleBtn.classList.remove("is-busy");
    }, wait);
    if (!fromAuto) resetAutoShuffle();
  }

  function clearAutoShuffle() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function resetAutoShuffle() {
    clearAutoShuffle();
    if (reduceMotion) return;
    autoTimer = setInterval(() => {
      if (document.hidden) return;
      onShuffle({ fromAuto: true });
    }, AUTO_MS);
  }

  function initShuffle() {
    if (!blockWordEl || !shuffleBtn) return;
    const fromHash = (location.hash || "").replace(/^#/, "").toLowerCase();
    const start =
      fromHash && /^[a-z]{2,8}$/.test(fromHash) && GLYPHS[fromHash[0]]
        ? fromHash
        : "muse";
    setWord(start, { animate: false, updateHash: fromHash !== start });
    shuffleBtn.addEventListener("click", () => onShuffle({ fromAuto: false }));
    window.addEventListener("resize", () => sizeWord(currentWord));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearAutoShuffle();
      else resetAutoShuffle();
    });
    resetAutoShuffle();
  }

  initShuffle();

  fetch("agents.json")
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load agents.json");
      return r.json();
    })
    .then((data) => {
      agents = Array.isArray(data) ? data : [];
      if (heroCountEl) heroCountEl.textContent = String(agents.length);
      renderFeatured();
      renderChips();
      renderCards();
    })
    .catch((err) => {
      countEl.textContent = "Could not load agents.";
      console.error(err);
    });
  function formatVisits(n) {
    return Number(n).toLocaleString("en-US");
  }

  function loadSiteVisits() {
    const el = document.getElementById("site-visits");
    if (!el) return;
    fetch("/api/visits", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.pageviews == null) return;
        const n = formatVisits(data.pageviews);
        el.textContent = `${n} site visits`;
        el.hidden = false;
      })
      .catch(() => {});
  }

  loadSiteVisits();
})();
