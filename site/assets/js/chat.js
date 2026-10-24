/* DNAProved — chat assistant widget.
   Talks to /api/chat (Netlify function backed by Claude). If that endpoint is
   unavailable, it answers from the built-in FAQ below so the widget never dead-ends. */
(function () {
  "use strict";

  var ENDPOINT = "/api/chat";
  var STORE_KEY = "dnaproved-chat-v1";
  var GREETING = "Hi! I can answer questions about bird DNA sexing, species ID, eDNA water screening, fermentation testing, prices and how to send samples. What would you like to know?";
  var SUGGESTIONS = ["How much is bird sexing?", "How do I collect feathers?", "What is eDNA?", "How do I place an order?"];

  var FAQ = [
    { k: ["price", "cost", "how much", "charge", "fee", "$"], a: "Prices: bird DNA sexing $18 per bird (first bird half price on your first order, free collection kit); DNA species ID $40 per specimen; eDNA water screening $135 per sample for 1 to 3 target species; microbe ID $75 per isolate; brewery QC plan $150 a month; DNA-verified sourdough starter $14 a packet (in person in New Jersey). Volume and group discounts are on the Services page: ./index.html#pricing" },
    { k: ["feather", "collect", "sample", "swab", "blood", "eggshell", "pluck"], a: "For bird sexing you can send a few plucked chest feathers (plucked, not molted, so the root is attached), a blood card, a swab, or the membrane from a hatched egg. We send a free collection kit with instructions and return postage. Start an order here: ./order.html?service=bird" },
    { k: ["edna", "e-dna", "lake", "pond", "water", "invasive"], a: "eDNA screening looks for DNA that animals and plants shed into water. You filter water with our field kit, and we run species-specific PCR for 1 to 3 target species, with field and lab blanks. You get detected or not detected for each target. It's $135 per sample with no ten-sample minimum. Results are screening information, not regulatory findings. Details: ./index.html#detail-edna" },
    { k: ["order", "buy", "kit", "start", "book", "send"], a: "To order, go to ./order.html, choose what you need, add your name and email, edit the prefilled message and send it. It reaches dna.proved@gmail.com and we reply with your kit and next steps." },
    { k: ["human", "paternity", "ancestry", "people", "person", "medical", "disease"], a: "We don't test human samples of any kind, and we don't diagnose disease. DNAProved works only with animal, environmental and microbial samples." },
    { k: ["species", "isopod", "insect", "fish", "mushroom", "fungi", "barcode", "identify", "identification"], a: "DNA species ID reads a barcode gene (COI for animals, ITS for fungi) by Sanger sequencing and matches it against reference databases. Send dead, dried or frozen specimens, never live animals. You get the best match, percent identity, the sequence trace and a signed report. $40 per specimen. Sellers can get a DNAproved species badge for listings." },
    { k: ["brew", "beer", "yeast", "kombucha", "sourdough", "starter", "ferment", "bakery"], a: "For breweries and kombucha makers we identify microbes ($75 per isolate) or run a $150 monthly QC plan with a purity screen plus one isolate ID. Your first contamination screen is free. We barcode yeast with ITS and bacteria with 16S. DNA-verified sourdough starter is $14 a packet, sold in person in New Jersey." },
    { k: ["long", "turnaround", "fast", "days", "when", "quick"], a: "Bird sexing results come back 2 business days after your sample arrives. Sequencing-based tests take a little longer; we'll confirm timing when you order." },
    { k: ["accurate", "accuracy", "wrong", "control", "reliable", "trust"], a: "Every run includes a known male and a known female bird, an extraction blank and a no-template PCR control. If any control fails, we repeat the run and never report it. Each report links to its raw gel photo or sequence trace, and we keep your DNA for 90 days for free re-tests." },
    { k: ["discount", "offer", "deal", "coupon", "club", "rescue", "school", "bulk", "volume"], a: "Current offers: free collection kits; first bird half price; 10% off 10+ birds and 15% off 25+; 10% off bird sexing for clubs, rescues and sanctuaries; 15% off species ID for schools and mycology clubs; an at-cost eDNA pilot season for New Jersey lake associations; and a free first contamination screen for breweries. Discounts don't stack: the best one applies." },
    { k: ["where", "location", "drop", "local", "new jersey", "nj", "address"], a: "We're a New Jersey lab. You can mail samples with our free kit or drop off in New Jersey by appointment. Email dna.proved@gmail.com to arrange a drop-off." },
    { k: ["pcr", "how does", "work", "science", "gel", "sequenc"], a: "We extract DNA, copy the target gene with PCR (about a billion copies in 30 cycles), then read it: bird sexing on an agarose gel (one band is male ZZ, two bands is female ZW), species and microbe IDs by Sanger sequencing. The full explanation is on ./science.html" }
  ];

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]"); } catch (e) { history = []; }
  var save = function () { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-16))); } catch (e) { /* storage unavailable */ } };

  var esc = function (s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var linkify = function (s) {
    return esc(s)
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, "<a href=\"$1\" target=\"_blank\" rel=\"noopener\">$1</a>")
      .replace(/(^|[\s(])(\.?\/(?:index|science|order|credits)\.html[^\s<]*?)(?=[\s<.,;:!?)]|$)/g, "$1<a href=\"$2\">$2</a>")
      .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, "<a href=\"mailto:$1\">$1</a>");
  };

  // DOM
  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chat-launcher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "chat-panel");
  var base = (document.currentScript && document.currentScript.src || "").replace(/assets\/js\/chat\.js.*$/, "") || "./";
  launcher.innerHTML = "<img src=\"" + base + "assets/img/logo-mark.png\" alt=\"\" width=\"134\" height=\"258\"><span>Ask a question</span>";
  launcher.setAttribute("aria-label", "Ask DNAProved a question");

  var panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.id = "chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "DNAProved assistant");
  panel.innerHTML =
    "<div class=\"chat-panel__head\"><div><strong>DNAProved assistant</strong><span>Answers about our tests, prices and samples</span></div>" +
    "<button type=\"button\" class=\"chat-close\" aria-label=\"Close chat\">×</button></div>" +
    "<div class=\"chat-log\" role=\"log\" aria-live=\"polite\" data-lenis-prevent></div>" +
    "<div><form class=\"chat-form\"><label class=\"visually-hidden\" for=\"chat-input\">Your question</label>" +
    "<textarea id=\"chat-input\" rows=\"1\" maxlength=\"1000\" placeholder=\"Type your question\"></textarea>" +
    "<button class=\"btn btn--small\" type=\"submit\">Send</button></form>" +
    "<p class=\"chat-foot\">AI answers can be wrong. For orders and anything important, email dna.proved@gmail.com.</p></div>";

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  var log = panel.querySelector(".chat-log");
  var form = panel.querySelector(".chat-form");
  var input = panel.querySelector("textarea");
  var sendBtn = form.querySelector("button");
  var busy = false;

  var bubble = function (role, text) {
    var el = document.createElement("div");
    el.className = "msg " + (role === "user" ? "msg--user" : "msg--bot");
    el.innerHTML = linkify(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  var suggestions = function () {
    var wrap = document.createElement("div");
    wrap.className = "chat-suggest";
    SUGGESTIONS.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = q;
      b.addEventListener("click", function () { wrap.remove(); ask(q); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
  };
  var render = function () {
    log.innerHTML = "";
    bubble("assistant", GREETING);
    history.forEach(function (m) { bubble(m.role, m.content); });
    if (!history.length) suggestions();
  };

  var localAnswer = function (q) {
    var t = q.toLowerCase(), best = null, score = 0;
    FAQ.forEach(function (f) {
      var s = f.k.reduce(function (n, k) { return n + (t.indexOf(k) !== -1 ? 1 : 0); }, 0);
      if (s > score) { score = s; best = f; }
    });
    return best ? best.a : "I don't have a ready answer for that one. Email dna.proved@gmail.com and we'll reply with details, or browse ./index.html#services and ./science.html.";
  };

  var ask = function (q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true;
    var chips = log.querySelector(".chat-suggest"); if (chips) chips.remove();
    history.push({ role: "user", content: q.slice(0, 1000) });
    bubble("user", q);
    var out = bubble("assistant", "Thinking…");
    out.classList.add("msg--typing");
    var text = "";
    var finish = function (final) {
      out.classList.remove("msg--typing");
      out.innerHTML = linkify(final);
      history.push({ role: "assistant", content: final });
      save();
      busy = false; sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
    };
    var fallback = function () { finish(localAnswer(q)); };

    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 28000);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-12) }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error("chat unavailable");
      var reader = res.body.getReader(), dec = new TextDecoder();
      var pump = function () {
        return reader.read().then(function (r) {
          if (r.done) { clearTimeout(to); if (text.trim()) finish(text.trim()); else fallback(); return; }
          text += dec.decode(r.value, { stream: true });
          out.classList.remove("msg--typing");
          out.innerHTML = linkify(text);
          log.scrollTop = log.scrollHeight;
          return pump();
        });
      };
      return pump();
    }).catch(function () {
      clearTimeout(to);
      if (text.trim()) finish(text.trim()); else fallback();
    });
  };

  var open = function () {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    render();
    if (window.gsap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.gsap.fromTo(panel, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" });
    }
    setTimeout(function () { input.focus(); }, 50);
  };
  var close = function () {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  };

  launcher.addEventListener("click", open);
  panel.querySelector(".chat-close").addEventListener("click", close);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; input.value = ""; ask(q); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); }
  });
  input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(120, input.scrollHeight) + "px"; });
})();
