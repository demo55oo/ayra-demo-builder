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
  var btnLabel = document.getElementById("btn-label");

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.dataset.state = state || "";
    statusEl.classList.remove("text-stone-500", "text-amber-900", "text-emerald-800", "text-rose-800");
    if (state === "working") statusEl.classList.add("text-amber-900");
    else if (state === "ok") statusEl.classList.add("text-emerald-800");
    else if (state === "error") statusEl.classList.add("text-rose-800");
    else statusEl.classList.add("text-stone-500");
  }

  function showResult(data) {
    idle.classList.add("hidden");
    result.classList.remove("hidden");
    document.getElementById("result-name").textContent = data.name || "Demo agent";
    document.getElementById("result-first").textContent = data.firstMessage || "";
    document.getElementById("result-id").textContent = data.assistantId || "—";
    var missing = data.missingFields || [];
    document.getElementById("result-missing").textContent = missing.length
      ? missing.join(", ")
      : "Nothing listed";
    var link = document.getElementById("result-link");
    link.href = data.vapiUrl || "https://dashboard.vapi.ai/assistants/" + (data.assistantId || "");
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
    btnLabel.textContent = "Working…";
    result.classList.add("hidden");
    idle.classList.remove("hidden");
    setStatus("Reading the site, writing the prompt, creating the agent…", "working");

    var payload = { websiteUrl: websiteUrl, agentName: agentName };
    var lastError = null;
    for (var i = 0; i < WEBHOOKS.length; i++) {
      try {
        var data = await postWebhook(WEBHOOKS[i], payload);
        showResult(data);
        setStatus("Done. Open it in Vapi and place a test call.", "ok");
        button.disabled = false;
        btnLabel.textContent = "Create the demo agent";
        return;
      } catch (err) {
        lastError = err;
      }
    }

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
