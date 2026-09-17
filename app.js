(function () {
  var WEBHOOKS = [
    "https://automation.ayra.cx/webhook/demo-agent-builder",
    "https://primary-production-7f76f.up.railway.app/webhook/demo-agent-builder"
  ];

  var form = document.getElementById("builder-form");
  var button = document.getElementById("submit-btn");
  var statusEl = document.getElementById("status");
  var result = document.getElementById("result");
  var idle = document.getElementById("idle-card");
  var working = document.getElementById("working-card");
  var btnLabel = document.getElementById("btn-label");
  var workTitle = document.getElementById("work-title");
  var workSub = document.getElementById("work-sub");
  var steps = document.querySelectorAll("#steps li");
  var timers = [];

  var PHASES = [
    { at: 0, step: 0, title: "Reading the site", sub: "Home, about, contact, services." },
    { at: 9000, step: 1, title: "Writing the inbound prompt", sub: "Same talk rules. New business facts." },
    { at: 28000, step: 2, title: "Creating the Vapi agent", sub: "MiniMax voice. Deepgram Flux." },
    { at: 48000, step: 3, title: "Getting a number you can call", sub: "Free Vapi line. Tap it on your phone." }
  ];

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  function setStep(active) {
    steps.forEach(function (el) {
      var n = Number(el.getAttribute("data-step"));
      if (n < active) el.setAttribute("data-state", "done");
      else if (n === active) el.setAttribute("data-state", "on");
      else el.removeAttribute("data-state");
    });
  }

  function setMode(mode) {
    idle.classList.toggle("hidden", mode !== "idle");
    working.classList.toggle("hidden", mode !== "working");
    result.classList.toggle("hidden", mode !== "ready");
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.classList.remove("text-slate-500", "text-ink", "text-ice", "text-emerald-700", "text-rose-700");
    if (state === "working") statusEl.classList.add("text-ice");
    else if (state === "ok") statusEl.classList.add("text-emerald-700");
    else if (state === "error") statusEl.classList.add("text-rose-700");
    else statusEl.classList.add("text-slate-500");
  }

  function startProgress() {
    clearTimers();
    setMode("working");
    PHASES.forEach(function (phase) {
      timers.push(setTimeout(function () {
        workTitle.textContent = phase.title;
        workSub.textContent = phase.sub;
        setStep(phase.step);
        setStatus(phase.title + "…", "working");
      }, phase.at));
    });
  }

  function prettyPhone(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.charAt(0) === "1") {
      return "+1 (" + digits.slice(1, 4) + ") " + digits.slice(4, 7) + "-" + digits.slice(7);
    }
    if (digits.length === 10) {
      return "+1 (" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
    }
    return raw || "";
  }

  function telHref(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.charAt(0) !== "1" && digits.length === 10) digits = "1" + digits;
    return "tel:+" + digits;
  }

  function showResult(data) {
    clearTimers();
    setStep(3);
    setMode("ready");
    document.getElementById("result-name").textContent = data.name || "Demo agent";
    document.getElementById("result-first").textContent = data.firstMessage || "";

    var raw = data.phoneNumber || data.phone || data.number || "";
    var href = data.phoneHref || telHref(raw);
    var label = data.phonePretty || prettyPhone(raw);
    var phone = document.getElementById("result-phone");
    var miss = document.getElementById("result-phone-miss");
    if (href && label) {
      phone.classList.remove("hidden");
      miss.classList.add("hidden");
      phone.href = href;
      document.getElementById("result-phone-label").textContent = label;
    } else {
      phone.classList.add("hidden");
      miss.classList.remove("hidden");
    }
  }

  function normalizeUrl(raw) {
    var value = (raw || "").trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    return value;
  }

  async function postWebhook(url, body) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 120000);
    try {
      var res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "The generator failed. Try again.");
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var websiteUrl = normalizeUrl(document.getElementById("website-url").value);
    var agentName = document.getElementById("agent-name").value.trim();
    if (!websiteUrl) {
      setStatus("Need a website URL.", "error");
      return;
    }

    button.disabled = true;
    btnLabel.textContent = "Building…";
    startProgress();

    var payload = { websiteUrl: websiteUrl, agentName: agentName };
    var lastError = null;
    for (var i = 0; i < WEBHOOKS.length; i++) {
      try {
        var data = await postWebhook(WEBHOOKS[i], payload);
        showResult(data);
        setStatus(data.phoneNumber || data.phone
          ? "Done. Tap the number to call from your phone."
          : "Done. Agent is ready.", "ok");
        button.disabled = false;
        btnLabel.textContent = "Create another demo";
        return;
      } catch (err) {
        lastError = err;
      }
    }

    clearTimers();
    setMode("idle");
    setStatus(
      lastError && lastError.name === "AbortError"
        ? "That took too long. Try again, or check the site loads."
        : (lastError && lastError.message) || "Could not reach the generator.",
      "error"
    );
    button.disabled = false;
    btnLabel.textContent = "Create the demo agent";
  });
})();
