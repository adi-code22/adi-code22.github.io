(() => {
  const root = document.documentElement;

  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
    },
  };

  /* ---------- the old Flutter build registered a service worker; drop it ---------- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }

  /* ---------- theme ---------- */
  const toggle = document.getElementById("theme-toggle");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light");

  const labelToggle = () => {
    if (!toggle) return;
    const next = currentTheme() === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", `Switch to ${next} theme`);
    toggle.title = `Switch to ${next} theme`;
  };

  toggle?.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("theme", next);
    labelToggle();
  });
  darkQuery.addEventListener?.("change", labelToggle);
  labelToggle();

  /* ---------- local time in Bengaluru ---------- */
  const timeEl = document.getElementById("local-time");
  if (timeEl) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    const tick = () => { timeEl.textContent = `${fmt.format(new Date())} IST`; };
    tick();
    setInterval(tick, 30_000);
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- copy email ---------- */
  const copyBtn = document.getElementById("copy-email");
  copyBtn?.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      copyBtn.textContent = "Copied";
    } catch {
      copyBtn.textContent = "Press ⌘C / Ctrl+C";
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(".mail"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 2200);
  });

  /* ---------- nav: hairline once scrolled, current section highlighted ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const navLinks = [...document.querySelectorAll(".nav__links a")];
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((a) => {
          if (a.getAttribute("href") === id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- fig. 1: one request down the stack, tokens back up ---------- */
  const stack = document.getElementById("stack");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!stack || reduceMotion) return;

  const layers = [...stack.querySelectorAll(".layer")];
  const packet = document.getElementById("stack-packet");
  const promptEl = document.getElementById("stack-prompt");
  const respEl = document.getElementById("stack-resp");
  const statusEl = document.getElementById("stack-status");
  const smGrid = document.getElementById("sm-grid");

  const pairs = [
    {
      q: "What does the KV cache do?",
      a: "It keeps the keys and values of tokens already processed, so each new token only computes its own.",
    },
    {
      q: "Why batch requests together?",
      a: "Decode is memory-bound. Batching reuses every weight read from HBM across many requests at once.",
    },
    {
      q: "What is speculative decoding?",
      a: "A small draft model guesses a few tokens ahead, and the big model checks them all in a single pass.",
    },
  ];

  // One hidden sizer per answer, stacked in the same grid cell, so the panel
  // is always as tall as the longest answer and the layers never shift.
  const answerBox = respEl.parentElement;
  answerBox.querySelectorAll(".stack__sizer").forEach((s) => s.remove());
  pairs.forEach(({ a }) => {
    const s = document.createElement("span");
    s.className = "stack__sizer";
    s.setAttribute("aria-hidden", "true");
    s.textContent = a;
    answerBox.prepend(s);
  });

  // 132 SMs on an H100 SXM
  const cells = [];
  if (smGrid) {
    for (let i = 0; i < 132; i++) {
      const c = document.createElement("i");
      smGrid.appendChild(c);
      cells.push(c);
    }
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const centreOf = (el) => el.offsetTop + el.offsetHeight / 2;
  const setStatus = (text, state) => {
    statusEl.textContent = text;
    statusEl.dataset.state = state;
  };
  const moveTo = (y, ms) => {
    packet.style.transitionDuration = ms ? `${ms}ms, 200ms` : "";
    packet.style.transform = `translateY(${y}px)`;
  };

  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(stack);

  async function request({ q, a }) {
    promptEl.textContent = q;
    respEl.textContent = "";
    stack.classList.add("is-live");
    setStatus("sending", "busy");

    packet.style.transition = "none";
    moveTo(-12);
    void packet.offsetWidth;
    packet.style.transition = "";
    packet.classList.add("on");
    await sleep(250);

    for (const layer of layers) {
      moveTo(centreOf(layer));
      layers.forEach((l) => l.classList.toggle("is-active", l === layer));
      setStatus(layer.dataset.status, "busy");
      await sleep(640);
    }

    for (let n = 0; n < 16; n++) {
      cells.forEach((c) => c.classList.toggle("on", Math.random() < 0.5));
      await sleep(55);
    }
    cells.forEach((c) => c.classList.remove("on"));

    setStatus("streaming tokens", "stream");
    for (let i = layers.length - 1; i >= 0; i--) {
      layers.forEach((l, j) => l.classList.toggle("is-active", j === i));
      moveTo(centreOf(layers[i]), 90);
      await sleep(80);
    }
    layers.forEach((l) => l.classList.remove("is-active"));
    moveTo(-12, 200);
    await sleep(200);
    packet.classList.remove("on");

    const words = a.split(" ");
    for (let w = 1; w <= words.length; w++) {
      respEl.textContent = words.slice(0, w).join(" ");
      await sleep(45 + Math.random() * 55);
    }

    stack.classList.remove("is-live");
    setStatus("200 OK", "ok");
  }

  (async function loop() {
    await sleep(900);
    for (let i = 0; ; i++) {
      while (!inView || document.hidden) await sleep(400);
      await request(pairs[i % pairs.length]);
      await sleep(4500);
    }
  })();
})();
