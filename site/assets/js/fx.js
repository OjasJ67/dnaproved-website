/* DNAProved — immersive layer: preloader, page transitions, smooth scroll,
   scroll-driven WebGL scenes, decoding headings, cursor, magnetic buttons,
   card tilt, marquee, grain, progress bar and the 3D services carousel.
   Everything degrades: without this file (or with reduced motion) the pages read normally. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BASES = "ACGT";
  var rand = function (n) { return Math.floor(Math.random() * n); };

  /* ---------- scenes ---------- */
  function setScene(name, opts) {
    if (!name) return;
    if (window.DNAScene) window.DNAScene.set(name, opts);
    else window.__pendingScene = name;
  }
  var CENTER = { x: 0, y: -0.3, scale: 1.15 };

  /* ---------- preloader (first page of a visit only) ---------- */
  function preloader() {
    var el = $(".preloader");
    var done = function () {
      root.classList.remove("is-loading");
      try { sessionStorage.setItem("dnaLoaded", "1"); } catch (e) { /* storage unavailable */ }
      document.dispatchEvent(new CustomEvent("dna:intro"));
    };
    if (!el || !root.classList.contains("is-loading")) return done();
    var count = $("[data-pl-count]", el), bar = $("[data-pl-bar]", el), seq = $("[data-pl-seq]", el);
    var start = performance.now(), loaded = document.readyState === "complete", minTime = 1500, maxTime = 3200;
    window.addEventListener("load", function () { loaded = true; });
    var seqLen = seq ? seq.textContent.length : 0;
    (function frame(now) {
      var t = now - start;
      var goal = loaded ? 1 : 0.86;
      var p = Math.min(goal, t / minTime);
      if (t > maxTime) p = 1;
      if (count) count.textContent = String(Math.round(p * 100)).padStart(3, "0");
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
      if (seq) {
        var s = "";
        for (var i = 0; i < seqLen; i++) s += i / seqLen < p ? "ATGCGTACCGATTACAGGTCATGCAT"[i % 26] : BASES[rand(4)];
        seq.textContent = s;
      }
      if (p < 1) return requestAnimationFrame(frame);
      el.classList.add("is-done");
      setTimeout(done, 380);
      setTimeout(function () { el.remove(); }, 1300);
    })(start);
  }

  /* ---------- page transitions (CSS-driven so they stay smooth while the next page loads) ---------- */
  function transitions() {
    if (reduceMotion) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page (hash links)
      e.preventDefault();
      try { sessionStorage.setItem("dnaTransition", "1"); } catch (err) { /* ignore */ }
      root.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 620);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) root.classList.remove("is-leaving", "is-entering"); });
    if (root.classList.contains("is-entering")) setTimeout(function () { root.classList.remove("is-entering"); }, 1400);
  }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  function smoothScroll() {
    if (reduceMotion || !window.Lenis || !gsap || !ST) return;
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href*='#']");
      if (!a) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var t = url.hash.indexOf("#detail-") === 0 ? ($("[data-tabs]") || document.getElementById(url.hash.slice(1))) : document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -80, duration: 1.4 });
      history.pushState(null, "", url.hash);
    });
    // keep the open mobile menu and chat from fighting the smooth scroller
    var nav = $("#site-nav");
    if (nav) new MutationObserver(function () { nav.classList.contains("is-open") ? lenis.stop() : lenis.start(); }).observe(nav, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------- decoding headings: letters resolve out of A, C, G and T ---------- */
  function scramble(el, duration) {
    var text = el.dataset.text || el.textContent;
    el.dataset.text = text;
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", text);
    var start = performance.now(), order = [];
    for (var i = 0; i < text.length; i++) order.push(i / text.length * 0.65 + Math.random() * 0.35);
    (function frame(now) {
      var p = Math.min(1, (now - start) / duration), out = "";
      for (var j = 0; j < text.length; j++) {
        var ch = text[j];
        out += p >= order[j] || /[\s.,'’:;!?()–—-]/.test(ch) ? ch : BASES[rand(4)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = text;
    })(start);
  }
  function headings() {
    if (reduceMotion || !ST) return;
    $$("main h2, main h3.card__title, [data-scramble]").forEach(function (h) {
      if (h.children.length || h.closest("[data-split]") || h.classList.contains("visually-hidden")) return;
      ST.create({ trigger: h, start: "top 88%", once: true, onEnter: function () { scramble(h, 1000); } });
    });
    $$("[data-scramble-hover]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { scramble(el, 500); });
    });
  }

  /* ---------- scene triggers ---------- */
  function sceneTriggers() {
    if (!ST) {
      var first = $("[data-scene]"); if (first) setScene(first.dataset.scene);
      return;
    }
    $$("[data-scene]").forEach(function (el) {
      if (el.classList.contains("card")) return; // the carousel drives its own cards
      ST.create({
        trigger: el, start: "top 60%", end: "bottom 60%",
        onToggle: function (self) { if (self.isActive) setScene(el.dataset.scene); }
      });
    });
    ST.create({ start: 0, end: "max", onUpdate: function (self) { if (window.DNAScene) window.DNAScene.setVelocity(self.getVelocity()); } });
  }

  /* ---------- progress bar ---------- */
  function progress() {
    var bar = $(".progress span");
    if (!bar || !ST) return;
    ST.create({ start: 0, end: "max", onUpdate: function (self) { bar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });
  }

  /* ---------- cursor ---------- */
  function cursor() {
    var c = $(".cursor");
    if (!c || !finePointer || reduceMotion) return;
    root.classList.add("has-cursor");
    var ring = $(".cursor__ring", c), dot = $(".cursor__dot", c), label = $(".cursor__label", c);
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      if (!shown) { shown = true; rx = x; ry = y; c.classList.add("is-visible"); }
    }, { passive: true });
    document.addEventListener("pointerleave", function () { shown = false; c.classList.remove("is-visible"); });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("a, button, [data-cursor], label.choice, summary, .lane-hit, input[type=range]");
      c.classList.toggle("is-hover", !!t);
      var text = t && t.getAttribute("data-cursor");
      label.textContent = text || "";
      c.classList.toggle("has-label", !!text);
      c.classList.toggle("is-text", !!e.target.closest("input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select"));
    });
    document.addEventListener("pointerdown", function () { c.classList.add("is-down"); });
    document.addEventListener("pointerup", function () { c.classList.remove("is-down"); });
  }

  /* ---------- magnetic buttons ---------- */
  function magnetic() {
    if (!finePointer || reduceMotion) return;
    $$(".btn, .chat-launcher, .scroll-cue").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = "translate3d(" + (dx * 14).toFixed(1) + "px," + (dy * 10).toFixed(1) + "px,0)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- card tilt ---------- */
  function tilt() {
    if (!finePointer || reduceMotion) return;
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg)";
        el.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- marquee: speed follows scroll velocity ---------- */
  function marquee() {
    if (reduceMotion || !gsap) return;
    $$(".marquee__track").forEach(function (track) {
      var dir = track.closest(".marquee").hasAttribute("data-reverse") ? 1 : -1;
      var tween = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, ease: "none", duration: 38, repeat: -1 });
      if (ST) ST.create({
        trigger: track, start: "top bottom", end: "bottom top",
        onUpdate: function (self) {
          var v = Math.min(6, 1 + Math.abs(self.getVelocity()) / 400);
          gsap.to(tween, { timeScale: v * (self.direction || 1), duration: 0.2, overwrite: true, onComplete: function () { gsap.to(tween, { timeScale: 1, duration: 1.2 }); } });
        }
      });
    });
  }

  /* ---------- grain ---------- */
  function grain() {
    var g = $(".grain");
    if (!g) return;
    var cv = document.createElement("canvas"); cv.width = cv.height = 160;
    var ctx = cv.getContext("2d"), img = ctx.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) { var v = rand(256); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 26; }
    ctx.putImageData(img, 0, 0);
    g.style.backgroundImage = "url(" + cv.toDataURL("image/png") + ")";
  }

  /* ---------- image reveals ---------- */
  function imageReveals() {
    if (reduceMotion || !gsap || !ST) return;
    $$("main .media").forEach(function (m) {
      if (m.closest(".card") || m.closest(".hero")) return;
      gsap.fromTo(m, { clipPath: "inset(18% 10% 18% 10%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.out",
        scrollTrigger: { trigger: m, start: "top 88%", once: true }
      });
    });
  }

  /* ---------- 3D services carousel ---------- */
  function carousel() {
    var sec = $(".carousel");
    if (!sec) return;
    var track = $(".carousel__track", sec), cards = $$(".card", sec), bar = $(".carousel__bar span", sec), counter = $("[data-carousel-count]", sec);
    var viewport = $(".carousel__viewport", sec), prev = $("[data-carousel-prev]", sec), next = $("[data-carousel-next]", sec);
    var active = -1;
    var activate = function (i) {
      if (i === active) return;
      active = i;
      cards.forEach(function (c, k) { c.classList.toggle("is-active", k === i); });
      if (counter) counter.textContent = String(i + 1);
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= cards.length - 1;
      setScene(cards[i].dataset.scene, innerWidth > 900 ? CENTER : null);
    };

    // swipe row (phones, reduced motion): scroll the row itself to centre a card
    var swipeTo = function (i) {
      var c = cards[i];
      if (c) viewport.scrollTo({ left: c.offsetLeft - (viewport.clientWidth - c.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    };
    var goTo = swipeTo;
    var step = function (d) { goTo(Math.max(0, Math.min(cards.length - 1, Math.max(0, active) + d))); };
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    sec.addEventListener("keydown", function (e) {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    });
    var watchRow = function () {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) activate(cards.indexOf(en.target)); });
      }, { root: viewport, threshold: 0.6 });
      cards.forEach(function (c) { io.observe(c); });
      return io;
    };

    if (!gsap || !ST || reduceMotion) {
      activate(0);
      watchRow();
      return;
    }

    var mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", function () {
      var offsets = [], widths = [], distance = 0, vw = innerWidth;
      var measure = function () {
        vw = innerWidth;
        distance = Math.max(0, track.scrollWidth - vw);
        offsets = cards.map(function (c) { return c.offsetLeft; });
        widths = cards.map(function (c) { return c.offsetWidth; });
      };
      measure();
      var place = function () {
        var x = gsap.getProperty(track, "x"), best = 0, bestD = 1e9;
        cards.forEach(function (c, i) {
          var center = offsets[i] + widths[i] / 2 + x;
          var off = (center - vw / 2) / (vw * 0.5);
          var o = Math.max(-1.6, Math.min(1.6, off)), a = Math.abs(o);
          c.style.transform = "translate3d(0,0," + (-a * 180).toFixed(1) + "px) rotateY(" + (-o * 24).toFixed(2) + "deg)";
          c.style.opacity = (1 - Math.min(a, 1.2) * 0.42).toFixed(3);
          if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
        });
        activate(best);
      };
      var tw = gsap.to(track, {
        x: function () { return -distance; }, ease: "none", onUpdate: place,
        scrollTrigger: {
          trigger: sec, pin: ".carousel__pin", start: "top top", end: function () { return "+=" + distance; },
          scrub: 0.8, invalidateOnRefresh: true,
          onRefresh: function () { measure(); place(); },
          onUpdate: function (self) { if (bar) bar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; },
          onToggle: function (self) { if (self.isActive) setScene(cards[Math.max(0, active)].dataset.scene, CENTER); }
        }
      });
      // pinned carousel: the arrows scroll the page to where card i sits in the centre
      goTo = function (i) {
        var st = tw.scrollTrigger;
        if (!st) return;
        var x = Math.max(-distance, Math.min(0, -(offsets[i] + widths[i] / 2 - vw / 2)));
        var y = st.start + (distance ? -x / distance : 0) * (st.end - st.start) + 2;
        if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: "smooth" });
      };
      place();
      return function () { tw.kill(); goTo = swipeTo; cards.forEach(function (c) { c.style.transform = ""; c.style.opacity = ""; }); };
    });
    mm.add("(max-width: 900px)", function () {
      var io2 = watchRow();
      var st = ST.create({ trigger: sec, start: "top 60%", end: "bottom 40%", onToggle: function (self) { if (self.isActive) setScene(cards[Math.max(0, active)].dataset.scene); } });
      return function () { io2.disconnect(); st.kill(); };
    });
  }

  /* ---------- boot ---------- */
  grain();
  transitions();
  smoothScroll();
  carousel();
  sceneTriggers();
  progress();
  headings();
  cursor();
  magnetic();
  tilt();
  marquee();
  imageReveals();
  preloader();
  if (ST) window.addEventListener("load", function () { ST.refresh(); });
})();
