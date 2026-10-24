/* DNAProved — order email composer.
   Sends through Netlify Forms (notifications go to dna.proved@gmail.com).
   Where the page can't submit (opened from disk, another host), it opens the visitor's email app instead. */
(function () {
  "use strict";

  var TO = "dna.proved@gmail.com";
  var form = document.querySelector("[data-order]");
  if (!form) return;

  var TEMPLATES = {
    bird: {
      subject: "Bird DNA sexing order",
      body: "Hello DNAProved,\n\nI'd like to order bird DNA sexing.\n\nNumber of birds: {qty}\nSpecies: \nSample type (feathers, blood card, swab or eggshell membrane): \nLeg band or microchip numbers, if any: \n\nPlease send a free collection kit: Yes / No\nShipping address for the kit: \nOr I'd like to drop off in New Jersey: Yes / No\n\nFirst order with you (first bird half price): Yes / No\nBird club, rescue or sanctuary (10% off): Yes / No\n\nAnything else:\n"
    },
    species: {
      subject: "DNA species ID request",
      body: "Hello DNAProved,\n\nI'd like DNA species identification.\n\nType of organism (isopod, insect, fish, mushroom culture, other): \nName it was sold or labelled under: \nNumber of specimens: {qty}\nHow they're preserved (dead, dried, frozen, in ethanol, culture): \n\nI'm a seller and would like a DNAproved species badge: Yes / No\nSchool, university or mycology club (15% off): Yes / No\n\nAnything else:\n"
    },
    edna: {
      subject: "eDNA water screening inquiry",
      body: "Hello DNAProved,\n\nI'm interested in eDNA water screening.\n\nOrganization: \nWaterbody and town: \nTarget species (up to 3 per sample): \nNumber of samples: {qty}\nPreferred sampling dates: \n\nWe'd like field sampling help in New Jersey: Yes / No\nWe're a lake association interested in the at-cost pilot season: Yes / No\n\nAnything else:\n"
    },
    ferment: {
      subject: "Fermentation microbe testing inquiry",
      body: "Hello DNAProved,\n\nI'm interested in fermentation microbe testing.\n\nBusiness type (brewery, kombucha, bakery, home baker, other): \nWhat I'd like: microbe ID / monthly QC plan / free first contamination screen / sourdough starter\nNumber of isolates or samples: {qty}\nWhat we're seeing, if anything is going wrong: \n\nAnything else:\n"
    },
    bulk: {
      subject: "Bulk order or partnership inquiry",
      body: "Hello DNAProved,\n\nI'd like to talk about a bulk order or partnership.\n\nOrganization: \nWhat we do: \nService(s) we're interested in: \nRough volume per month or season: \n\nAnything else:\n"
    },
    question: {
      subject: "Question for DNAProved",
      body: "Hello DNAProved,\n\nMy question:\n\n"
    }
  };

  var params = new URLSearchParams(location.search);
  var qty = Math.max(1, Math.min(999, parseInt(params.get("qty"), 10) || 1));
  var drafts = {};
  var current = null;
  var radios = Array.prototype.slice.call(form.querySelectorAll("input[name=request]"));
  var subject = form.querySelector("#f-subject");
  var message = form.querySelector("#f-message");
  var nameEl = form.querySelector("#f-name");
  var emailEl = form.querySelector("#f-email");
  var status = form.querySelector("[data-status]");
  var sendBtn = form.querySelector("[data-send]");

  var fill = function (key) {
    if (current) drafts[current] = { subject: subject.value, body: message.value };
    current = key;
    var d = drafts[key] || { subject: TEMPLATES[key].subject, body: TEMPLATES[key].body.replace("{qty}", String(qty)) };
    subject.value = d.subject;
    message.value = d.body;
  };
  radios.forEach(function (r) { r.addEventListener("change", function () { if (r.checked) fill(r.dataset.key); }); });

  var wanted = params.get("service");
  var start = radios.filter(function (r) { return r.dataset.key === wanted; })[0] || radios[0];
  start.checked = true;
  fill(start.dataset.key);

  if (params.get("sent") === "1") show("ok", "Sent. Your request is on its way to " + TO + ". We'll reply by email.");

  function show(kind, html) {
    status.className = "status is-visible status--" + kind;
    status.innerHTML = html;
  }
  function setError(el, msg) {
    var err = document.getElementById("e-" + el.name);
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }
  function validate() {
    var bad = [];
    var n = nameEl.value.trim();
    if (n.length < 2) { setError(nameEl, "Please enter your name."); bad.push(nameEl); } else setError(nameEl, "");
    var e = emailEl.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { setError(emailEl, "Please enter an email address we can reply to."); bad.push(emailEl); } else setError(emailEl, "");
    if (message.value.trim().length < 10) { setError(message, "Please add a short message."); bad.push(message); } else setError(message, "");
    if (bad.length) bad[0].focus();
    return !bad.length;
  }
  [nameEl, emailEl, message].forEach(function (el) {
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") validate(); });
  });

  function mailtoHref() {
    var company = form.querySelector("#f-company").value.trim();
    var phone = form.querySelector("#f-phone").value.trim();
    var request = (radios.filter(function (r) { return r.checked; })[0] || {}).value || "";
    var head = "Request: " + request + "\nName: " + nameEl.value.trim() + (company ? "\nCompany: " + company : "") + "\nEmail: " + emailEl.value.trim() + (phone ? "\nPhone: " + phone : "") + "\n\n";
    return "mailto:" + TO + "?subject=" + encodeURIComponent(subject.value) + "&body=" + encodeURIComponent(head + message.value);
  }

  form.querySelector("[data-mailto]").addEventListener("click", function () {
    if (!validate()) return;
    window.location.href = mailtoHref();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
    var data = new URLSearchParams(new FormData(form)).toString();
    var fail = function () {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send to DNAProved";
      show("err", "We couldn't send it from this page. <a class=\"link\" href=\"" + mailtoHref().replace(/"/g, "&quot;") + "\">Open it in your email app</a> instead, or write to <a class=\"link\" href=\"mailto:" + TO + "\">" + TO + "</a>.");
    };
    if (location.protocol === "file:") return fail();
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data })
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        var who = emailEl.value.trim();
        drafts = {};
        form.reset();
        start.checked = true;
        current = null;
        fill(start.dataset.key);
        sendBtn.disabled = false;
        sendBtn.textContent = "Send to DNAProved";
        show("ok", "<strong>Sent.</strong> Your request is on its way to " + TO + ". We'll reply to " + who.replace(/[<>&"]/g, "") + ".");
        status.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(fail);
  });
})();
