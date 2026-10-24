/* DNAProved — page behaviour and motion.
   Everything here is progressive: pages read completely without this file. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var money = function (n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

  /* ---------- Prices and discounts: edit here ---------- */
  var PRICING = {
    bird: { label: "Bird DNA sexing", unit: "bird", price: 18 },
    species: { label: "DNA species ID", unit: "specimen", price: 40 },
    edna: { label: "eDNA water screening", unit: "sample", price: 135 },
    microbe: { label: "Microbe ID", unit: "isolate", price: 75 },
    qc: { label: "Brewery QC plan", unit: "month", price: 150 },
    starter: { label: "Verified sourdough starter", unit: "packet", price: 14 }
  };
  // Percentage discounts: the best single one applies; the first-bird offer comes on top.
  var VOLUME = {
    bird: [{ min: 25, pct: 15 }, { min: 10, pct: 10 }],
    species: [{ min: 20, pct: 15 }, { min: 5, pct: 10 }],
    edna: [{ min: 5, pct: 10 }]
  };
  var GROUP = { bird: { key: "club", pct: 10, label: "Club, rescue or sanctuary" }, species: { key: "school", pct: 15, label: "School or mycology club" } };

  /* ---------- header ---------- */
  var header = $(".site-header");
  var toggle = $(".menu-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.textContent = open ? "Menu" : "Close";
      nav.classList.toggle("is-open", !open);
      document.body.style.overflow = open ? "" : "hidden";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && nav.classList.contains("is-open")) toggle.click();
    });
  }
  window.addEventListener("scroll", function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });

  /* ---------- tiny tween helper (used where GSAP is optional) ---------- */
  function tween(duration, onUpdate, ease, done) {
    var start = null;
    ease = ease || function (t) { return 1 - Math.pow(1 - t, 3); };
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      onUpdate(ease(t));
      if (t < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- live gel ---------- */
  var gel = $("[data-gel]");
  if (gel) {
    var READ = [
      ["Ladder: pieces of known length.", "It works like a ruler, showing how far DNA of each size travels through the gel."],
      ["Male control: one band.", "A known male (ZZ). His two Z copies of CHD1 are the same length, so they run as one band."],
      ["Female control: two bands.", "A known female (ZW). Her Z and W copies differ in length, so they stop at different heights."],
      ["Bird A: two bands, so female.", "It matches the female control. The certificate reads: DNAproved female."],
      ["Bird B: one band, so male.", "It matches the male control. The certificate reads: DNAproved male."],
      ["Blank: no bands, so the run is clean.", "No DNA went in and none came out. A band here would mean contamination, and the run would be repeated."]
    ];
    var bands = $$(".band", gel);
    bands.forEach(function (b) { b.dataset.y = b.getAttribute("y"); b.dataset.o = b.getAttribute("opacity") || "1"; });
    var readout = $("[data-gel-readout]", gel);
    var lanes = $$(".lane-hit", gel);

    var select = function (lane) {
      lanes.forEach(function (l) { l.classList.toggle("is-active", l.dataset.lane === String(lane)); });
      bands.forEach(function (b) { b.setAttribute("opacity", b.dataset.lane === String(lane) ? "1" : String(Number(b.dataset.o) * 0.35)); });
      readout.innerHTML = "<strong>" + READ[lane][0] + "</strong><span>" + READ[lane][1] + "</span>";
    };
    lanes.forEach(function (l) {
      l.addEventListener("click", function () { select(Number(l.dataset.lane)); });
      l.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(Number(l.dataset.lane)); }
      });
    });

    var running = false;
    var run = function () {
      if (running) return;
      running = true;
      bands.forEach(function (b) { b.setAttribute("y", "44"); b.setAttribute("opacity", "0"); });
      // Same voltage, same time: shorter pieces travel farther, as in a real gel.
      tween(reduceMotion ? 1 : 2200, function (t) {
        bands.forEach(function (b) {
          var y = 44 + (Number(b.dataset.y) - 44) * t;
          b.setAttribute("y", y.toFixed(1));
          b.setAttribute("opacity", String(Math.min(1, t * 3) * Number(b.dataset.o)));
        });
      }, function (t) { return 1 - Math.pow(1 - t, 2.2); }, function () {
        running = false;
        var active = $(".lane-hit.is-active", gel);
        if (active) select(Number(active.dataset.lane));
      });
    };
    $("[data-gel-run]", gel).addEventListener("click", run);
    if (!reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); setTimeout(run, 350); }
      }, { threshold: 0.35 });
      io.observe(gel);
    }
  }

  /* ---------- service detail tabs ---------- */
  var tabs = $("[data-tabs]");
  if (tabs) {
    var tabBtns = $$("[role=tab]", tabs), panels = $$("[role=tabpanel]", tabs);
    tabs.classList.add("js-tabs");
    var showTab = function (key, opts) {
      opts = opts || {};
      var btn = tabBtns.filter(function (b) { return b.dataset.tab === key; })[0];
      if (!btn) return;
      tabBtns.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        var on = p.id === "detail-" + key;
        p.hidden = !on;
        if (on && !opts.init && window.gsap && !reduceMotion) window.gsap.fromTo(p, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
      });
      if (opts.focus) btn.focus();
      var sec = tabs.closest("section");
      if (sec && btn.dataset.sceneTab) sec.dataset.scene = btn.dataset.sceneTab;
      if (!opts.init && window.DNAScene && btn.dataset.sceneTab) window.DNAScene.set(btn.dataset.sceneTab);
    };
    tabBtns.forEach(function (b, i) {
      b.addEventListener("click", function () { showTab(b.dataset.tab); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        showTab(tabBtns[(i + d + tabBtns.length) % tabBtns.length].dataset.tab, { focus: true });
      });
    });
    // "Details" links from the carousel and footer open the matching tab first
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href*='#detail-']");
      if (!a) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname) return;
      showTab(url.hash.replace("#detail-", ""));
    });
    var fromHash = location.hash.indexOf("#detail-") === 0 ? location.hash.slice(8) : null;
    showTab(fromHash || tabBtns[0].dataset.tab, { init: true });
    if (fromHash) setTimeout(function () { tabs.scrollIntoView({ block: "start" }); }, 400);
  }

  /* ---------- price estimator ---------- */
  var est = $("[data-estimate]");
  if (est) {
    var svc = $("#est-service", est), qty = $("#est-qty", est), first = $("#est-first", est), group = $("#est-group", est);
    var groupWrap = $("[data-group-wrap]", est), groupLabel = $("[data-group-label]", est);
    var firstWrap = $("[data-first-wrap]", est);
    var lines = $("[data-est-lines]"), total = $("[data-est-total]"), note = $("[data-est-note]"), orderLink = $("[data-est-order]");
    var calc = function () {
      var key = svc.value, p = PRICING[key], n = Math.max(1, Math.min(999, parseInt(qty.value, 10) || 1));
      var sub = p.price * n, html = "";
      html += "<li><span>" + n + " × " + p.label.toLowerCase() + " at " + money(p.price) + "</span><span>" + money(sub) + "</span></li>";
      var firstOff = 0;
      if (key === "bird" && first.checked) { firstOff = p.price / 2; html += "<li class=\"minus\"><span>First bird half price</span><span>−" + money(firstOff) + "</span></li>"; }
      var best = { pct: 0, label: "" };
      (VOLUME[key] || []).some(function (t) { if (n >= t.min) { best = { pct: t.pct, label: t.pct + "% off " + t.min + "+ " + p.unit + "s" }; return true; } return false; });
      if (GROUP[key] && group.checked && GROUP[key].pct > best.pct) best = { pct: GROUP[key].pct, label: GROUP[key].pct + "% " + GROUP[key].label.toLowerCase() };
      var pctOff = 0;
      if (best.pct) { pctOff = (sub - firstOff) * best.pct / 100; html += "<li class=\"minus\"><span>" + best.label + "</span><span>−" + money(Math.round(pctOff * 100) / 100) + "</span></li>"; }
      var t = Math.round((sub - firstOff - pctOff) * 100) / 100;
      lines.innerHTML = html;
      total.textContent = money(t);
      var notes = {
        bird: "Includes a free collection kit with return postage.",
        species: "Sellers can add a public record page and DNAproved badge for each verified species.",
        edna: "Lake associations can ask about the at-cost pilot season. Field sampling help available in New Jersey.",
        microbe: "Your first contamination screen is free.",
        qc: "Monthly purity screen plus one isolate ID. Your first contamination screen is free.",
        starter: "Sold in person in New Jersey only, under a cottage food permit."
      };
      note.textContent = notes[key];
      firstWrap.hidden = key !== "bird";
      groupWrap.hidden = !GROUP[key];
      if (GROUP[key]) groupLabel.textContent = GROUP[key].label + " (" + GROUP[key].pct + "% off)";
      var map = { bird: "bird", species: "species", edna: "edna", microbe: "ferment", qc: "ferment", starter: "ferment" };
      if (orderLink) orderLink.href = "./order.html?service=" + map[key] + "&qty=" + n;
    };
    [svc, qty, first, group].forEach(function (el) { el.addEventListener("input", calc); el.addEventListener("change", calc); });
    calc();
  }

  /* ---------- science: PCR simulator ---------- */
  var pcr = $("[data-pcr-sim]");
  if (pcr) {
    var range = $("input[type=range]", pcr), copiesOut = $("[data-copies]", pcr), cycleOut = $("[data-cycle]", pcr), stepOut = $("[data-step]", pcr);
    var curve = $("[data-curve]", pcr), area = $("[data-area]", pcr), dot = $("[data-dot]", pcr), playBtn = $("[data-play]", pcr);
    var W = 560, H = 220, X0 = 40, Y0 = 250;
    var draw = function (c) {
      var pts = [], max = Math.pow(2, 35);
      for (var i = 0; i <= c; i++) {
        var x = X0 + (i / 35) * W, y = Y0 - (Math.pow(2, i) / max) * H;
        pts.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      curve.setAttribute("points", pts.join(" "));
      area.setAttribute("points", pts.join(" ") + " " + (X0 + (c / 35) * W).toFixed(1) + "," + Y0 + " " + X0 + "," + Y0);
      var copies = Math.pow(2, c);
      copiesOut.textContent = fmt(copies);
      cycleOut.textContent = c;
      var p = Math.pow(2, c) / max;
      dot.setAttribute("cx", (X0 + (c / 35) * W).toFixed(1));
      dot.setAttribute("cy", (Y0 - p * H).toFixed(1));
    };
    var steps = ["Denature at 95 °C: the two strands separate.", "Anneal at about 55 °C: primers grip either side of the target.", "Extend at 72 °C: the polymerase builds two new strands."];
    var timer = null;
    range.addEventListener("input", function () { draw(Number(range.value)); stepOut.textContent = Number(range.value) ? "Each finished cycle doubles the target." : steps[0]; });
    playBtn.addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "Run 30 cycles"; return; }
      var c = 0, phase = 0;
      range.value = 0; draw(0);
      playBtn.textContent = "Pause";
      timer = setInterval(function () {
        stepOut.textContent = steps[phase];
        phase++;
        if (phase === 3) { phase = 0; c++; range.value = c; draw(c); }
        if (c >= 30) { clearInterval(timer); timer = null; playBtn.textContent = "Run 30 cycles"; stepOut.textContent = "30 cycles: about a billion copies, enough to see on a gel."; }
      }, reduceMotion ? 30 : 120);
    });
    draw(Number(range.value));
  }

  /* ---------- science: chromatogram ---------- */
  var chrom = $("[data-chromatogram]");
  if (chrom) {
    var seq = chrom.getAttribute("data-seq") || "TTGGATCATCCATTGGAGCCCTTCTAGGAGATGACCAAATTTATAATGTAATTGTT";
    var colors = { A: "#2fa36b", C: "#57b8e0", G: "#c9d6dd", T: "#e5528e" };
    var svgNS = "http://www.w3.org/2000/svg", cw = 900, ch = 260, base = 220, step = cw / (seq.length + 1);
    var tracks = { A: [], C: [], G: [], T: [] };
    var rand = function (i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
    for (var px = 0; px <= cw; px += 3) {
      ["A", "C", "G", "T"].forEach(function (b) {
        var y = 0;
        for (var i = 0; i < seq.length; i++) {
          var cx = step * (i + 1), d = px - cx;
          var hgt = seq[i] === b ? 120 + rand(i) * 70 : 6 + rand(i + 99) * 8;
          y += hgt * Math.exp(-(d * d) / (2 * 5.2 * 5.2));
        }
        tracks[b].push((px === 0 ? "M" : "L") + px + "," + (base - Math.min(y, 200)).toFixed(1));
      });
    }
    var svg = $("svg", chrom);
    ["G", "A", "C", "T"].forEach(function (b) {
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", tracks[b].join(" "));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", colors[b]);
      path.setAttribute("stroke-width", "2.2");
      path.setAttribute("class", "trace");
      svg.appendChild(path);
    });
    var calls = document.createElementNS(svgNS, "g");
    calls.setAttribute("font-family", "Archivo, sans-serif");
    calls.setAttribute("font-size", "14");
    calls.setAttribute("text-anchor", "middle");
    for (var j = 0; j < seq.length; j++) {
      var tx = document.createElementNS(svgNS, "text");
      tx.setAttribute("x", (step * (j + 1)).toFixed(1));
      tx.setAttribute("y", "250");
      tx.setAttribute("fill", colors[seq[j]]);
      tx.setAttribute("class", "call");
      tx.textContent = seq[j];
      calls.appendChild(tx);
    }
    svg.appendChild(calls);
  }

  /* ---------- science: qPCR curves ---------- */
  var qpcr = $("[data-qpcr]");
  if (qpcr) {
    var qs = $("svg", qpcr), NS = "http://www.w3.org/2000/svg";
    var curves = [{ ct: 24, color: "#57b8e0" }, { ct: 27, color: "#57b8e0" }, { ct: 25.5, color: "#57b8e0" }, { ct: 99, color: "#f07aa8" }, { ct: 99, color: "#9fb9c6" }];
    curves.forEach(function (c) {
      var d = "";
      for (var cyc = 0; cyc <= 40; cyc += 0.5) {
        var f = c.ct > 60 ? 0.01 * Math.sin(cyc) + 0.01 : 1 / (1 + Math.exp(-(cyc - c.ct - 2.5) / 1.35));
        var x = 50 + cyc * 13.5, y = 250 - f * 200;
        d += (cyc === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
      }
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", c.color); p.setAttribute("stroke-width", "3"); p.setAttribute("class", "trace");
      qs.appendChild(p);
    });
  }

  /* ---------- science: rotating helix ---------- */
  var rotor = $("[data-helix-rotor]");
  if (rotor) {
    var rs = $("svg", rotor), RNS = "http://www.w3.org/2000/svg", RUNGS = 22, rungEls = [], strandA = document.createElementNS(RNS, "path"), strandB = document.createElementNS(RNS, "path");
    var pairs = "ATGCGTACCGATTACAGGTCAT";
    var pairColor = { A: "#57b8e0", T: "#e5528e", G: "#c9d6dd", C: "#2fa36b" };
    var comp = { A: "T", T: "A", G: "C", C: "G" };
    for (var r = 0; r < RUNGS; r++) {
      var g = document.createElementNS(RNS, "g");
      var l1 = document.createElementNS(RNS, "line"), l2 = document.createElementNS(RNS, "line");
      l1.setAttribute("stroke", pairColor[pairs[r]]); l2.setAttribute("stroke", pairColor[comp[pairs[r]]]);
      l1.setAttribute("stroke-width", "7"); l2.setAttribute("stroke-width", "7");
      l1.setAttribute("stroke-linecap", "round"); l2.setAttribute("stroke-linecap", "round");
      g.appendChild(l1); g.appendChild(l2); rs.appendChild(g); rungEls.push([l1, l2]);
    }
    [strandA, strandB].forEach(function (s, i) { s.setAttribute("fill", "none"); s.setAttribute("stroke", i ? "#c12b6c" : "#57b8e0"); s.setAttribute("stroke-width", "10"); s.setAttribute("stroke-linecap", "round"); rs.appendChild(s); });
    var phase = 0, visible = true;
    var paint = function () {
      var cx = 160, amp = 110, top = 20, gap = 26, dA = "", dB = "";
      for (var k = 0; k < RUNGS; k++) {
        var y = top + k * gap, a = phase + k * 0.55;
        var xa = cx + Math.sin(a) * amp, xb = cx - Math.sin(a) * amp, mid = (xa + xb) / 2;
        rungEls[k][0].setAttribute("x1", xa.toFixed(1)); rungEls[k][0].setAttribute("x2", mid.toFixed(1));
        rungEls[k][1].setAttribute("x1", mid.toFixed(1)); rungEls[k][1].setAttribute("x2", xb.toFixed(1));
        rungEls[k].forEach(function (ln) { ln.setAttribute("y1", y); ln.setAttribute("y2", y); ln.setAttribute("opacity", (0.45 + 0.55 * Math.abs(Math.cos(a))).toFixed(2)); });
        dA += (k ? "L" : "M") + xa.toFixed(1) + "," + y; dB += (k ? "L" : "M") + xb.toFixed(1) + "," + y;
      }
      strandA.setAttribute("d", dA); strandB.setAttribute("d", dB);
    };
    paint();
    if (!reduceMotion) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(rotor);
      (function loop() { if (visible) { phase += 0.018; paint(); } requestAnimationFrame(loop); })();
    }
  }

  /* ---------- credits list (credits page) ---------- */
  var creditList = $("[data-credits]");
  if (creditList) {
    fetch("./assets/img/credits.json").then(function (r) { return r.json(); }).then(function (data) {
      creditList.innerHTML = Object.keys(data).map(function (k) {
        var c = data[k];
        return "<li><strong>" + c.title.replace(/\.(jpg|png|jpeg)$/i, "") + "</strong>. " + (c.creator || "Unknown") + ". " + c.license + ". <a href=\"" + c.source + "\" rel=\"noopener\" target=\"_blank\">Source</a></li>";
      }).join("");
    }).catch(function () {});
  }

  /* ---------- GSAP motion layer ---------- */
  (function motion() {
    var root = document.documentElement;
    if (reduceMotion || !root.classList.contains("js-motion")) return;
    if (!window.gsap || !window.ScrollTrigger) { root.classList.add("motion-fallback"); return; }
    clearTimeout(window.__motionTimer);
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);

    // The first screen waits for the preloader (if any) to lift.
    var intro = root.classList.contains("is-loading")
      ? Promise.race([new Promise(function (r) { document.addEventListener("dna:intro", r, { once: true }); }), new Promise(function (r) { setTimeout(r, 5000); })])
      : Promise.resolve();
    var fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 1200); })]);

    // Headline: words rise into place once the typeface is ready.
    $$("[data-split]").forEach(function (h) {
      Promise.all([fontsReady, intro]).then(function () {
        gsap.set(h, { opacity: 1 });
        if (!window.SplitText) return;
        var split = new window.SplitText(h, { type: "words,lines", linesClass: "split-line" });
        gsap.from(split.words, { yPercent: 110, rotate: 4, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 });
      });
    });

    // Section parts enter in order: heading, text, picture.
    var firstSection = $("main section");
    $$("main section, main article").forEach(function (sec) {
      var items = $$("[data-reveal]", sec).filter(function (el) { return el.parentElement.closest("section, article") === sec; });
      if (!items.length) return;
      if (sec === firstSection) {
        intro.then(function () {
          gsap.fromTo(items, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.09, delay: 0.35 });
        });
        return;
      }
      gsap.fromTo(items, { y: 28, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: sec, start: "top 82%", once: true }
      });
    });

    // Carousel cards rise in once as the carousel arrives.
    $$(".carousel").forEach(function (c) {
      gsap.fromTo($$(".card__inner", c), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: c, start: "top 70%", once: true }, clearProps: "transform" });
    });

    // Counting statistics.
    $$("[data-count]").forEach(function (el) {
      var end = Number(el.dataset.count), pre = el.dataset.prefix ? ">" : "", obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: function () { el.textContent = pre + Math.round(obj.v); }
      });
    });

    // Slow drift on pictures as they pass.
    $$("[data-drift]").forEach(function (img) {
      gsap.fromTo(img, { scale: 1.12, yPercent: -4 }, {
        scale: 1.02, yPercent: 4, ease: "none",
        scrollTrigger: { trigger: img.closest(".media") || img, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // The helix draws itself down the six steps.
    $$("[data-helix-draw]").forEach(function (svg) {
      var paths = $$("path", svg);
      paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.to(paths, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 70%", end: "bottom 75%", scrub: 0.6 } });
      gsap.from($$(".rungs line", svg), { opacity: 0, scaleX: 0, transformOrigin: "50% 50%", stagger: 0.2, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 70%", end: "bottom 75%", scrub: 0.6 } });
    });

    // PCR counter climbs as the section scrolls.
    $$("[data-pcr-counter]").forEach(function (el) {
      var obj = { c: 0 };
      el.textContent = "1";
      gsap.to(obj, {
        c: 30, ease: "none",
        scrollTrigger: { trigger: el.closest("section"), start: "top 75%", end: "center 40%", scrub: 0.4 },
        onUpdate: function () { el.textContent = fmt(Math.pow(2, Math.round(obj.c))); }
      });
    });

    // Control gel bands settle in.
    $$(".ctrl-bands rect").forEach(function (b, i) {
      gsap.from(b, { attr: { y: 36 }, opacity: 0, duration: 1.4, ease: "power2.out", delay: i * 0.02, scrollTrigger: { trigger: ".controls__figure", start: "top 75%", once: true } });
    });

    // Traces draw on (chromatogram, qPCR).
    $$("[data-chromatogram], [data-qpcr]").forEach(function (box) {
      var traces = $$(".trace", box);
      traces.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.to(traces, { strokeDashoffset: 0, duration: 2.4, ease: "power1.inOut", stagger: 0.15, scrollTrigger: { trigger: box, start: "top 75%", once: true } });
      if ($(".call", box).length) gsap.from($(".call", box), { opacity: 0, y: 6, duration: 0.3, stagger: 0.025, delay: 0.6, scrollTrigger: { trigger: box, start: "top 75%", once: true } });
    });

    document.fonts && document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener("load", function () { ST.refresh(); });
  })();
})();
