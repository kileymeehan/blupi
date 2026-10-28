// Side panel UI. Steps live in chrome.storage and are changed only through the
// background worker (see background.js); this file renders them and talks to
// the Blupi API when it's time to create a board.

const DEFAULT_BASE_URL = "https://blupi-production.up.railway.app";

const $ = (id) => document.getElementById(id);
let connection = null; // { baseUrl, token, user }
let steps = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function showError(el, message) {
  el.textContent = message || "";
  el.hidden = !message;
}

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload }).then((res) => {
    if (!res?.ok) throw new Error(res?.error || "Something went wrong");
    return res.result;
  });
}

async function api(path, options = {}) {
  const res = await fetch(connection.baseUrl + path, {
    ...options,
    headers: { Authorization: `Bearer ${connection.token}`, ...options.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).message || message;
    } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Connecting ─────────────────────────────────────────────────────────────

function showConnect(message) {
  $("connect-view").hidden = false;
  $("main-view").hidden = true;
  $("settings-btn").hidden = true;
  $("account").textContent = "Not connected";
  $("base-url").value = connection?.baseUrl || DEFAULT_BASE_URL;
  $("token").value = "";
  showError($("connect-error"), message);
}

async function showMain() {
  $("connect-view").hidden = true;
  $("main-view").hidden = false;
  $("settings-btn").hidden = false;
  $("account").textContent = `${connection.user.email} · ${hostOf(connection.baseUrl) || connection.baseUrl}`;
  await loadProjects();
}

async function loadProjects() {
  try {
    const me = await api("/api/extension/me");
    const select = $("project");
    const current = select.value;
    select.replaceChildren(new Option("No project", ""));
    for (const p of me.projects) select.add(new Option(p.name, String(p.id)));
    if ([...select.options].some((o) => o.value === current)) select.value = current;
    // Only offer the AI draft when this Blupi server has it set up
    $("ai-draft-row").hidden = !me.aiAvailable;
  } catch (err) {
    if (err.status === 401) showConnect("This token no longer works. Create a new one in Blupi settings.");
  }
}

$("connect-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const baseUrl = $("base-url").value.trim().replace(/\/+$/, "");
  const token = $("token").value.trim();
  showError($("connect-error"), "");
  connection = { baseUrl, token, user: null };
  try {
    const me = await api("/api/extension/me");
    connection.user = me.user;
    await chrome.storage.local.set({ connection });
    await showMain();
  } catch (err) {
    connection = null;
    showError($("connect-error"), err.status === 401 ? "That token wasn't accepted." : `Couldn't reach Blupi: ${err.message}`);
  }
});

$("get-token").addEventListener("click", () => {
  const base = ($("base-url").value.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  chrome.tabs.create({ url: `${base}/settings?tab=extension` });
});

$("settings-btn").addEventListener("click", async () => {
  if (!confirm("Disconnect from Blupi? Your captured steps are kept.")) return;
  await chrome.storage.local.remove("connection");
  showConnect();
});

// ── Capturing ──────────────────────────────────────────────────────────────

$("capture-btn").addEventListener("click", async () => {
  const btn = $("capture-btn");
  btn.disabled = true;
  showError($("capture-error"), "");
  try {
    await send("capture");
  } catch (err) {
    showError($("capture-error"), err.message);
  } finally {
    btn.disabled = false;
  }
});

$("auto-capture").addEventListener("change", (e) => {
  chrome.storage.local.set({ autoCapture: e.target.checked });
});

$("ai-draft").addEventListener("change", (e) => {
  chrome.storage.local.set({ aiDraft: e.target.checked });
});

$("clear-btn").addEventListener("click", () => {
  if (confirm(`Remove all ${steps.length} captured steps?`)) send("clearSteps");
});

chrome.commands.getAll().then((commands) => {
  const shortcut = commands.find((c) => c.name === "capture-step")?.shortcut;
  $("shortcut").textContent = shortcut || "not set (chrome://extensions/shortcuts)";
});

// ── Step list ──────────────────────────────────────────────────────────────

const stepEls = new Map();

function createStepEl(step) {
  const li = $("step-template").content.firstElementChild.cloneNode(true);
  li.dataset.id = step.id;
  li.querySelector(".thumb").src = step.screenshot;
  // Saved on change (blur/Enter), so re-renders never interrupt typing
  li.querySelector(".step-title").addEventListener("change", (e) =>
    send("updateStep", { id: step.id, changes: { title: e.target.value.trim() } }));
  li.querySelector(".step-note").addEventListener("change", (e) =>
    send("updateStep", { id: step.id, changes: { note: e.target.value.trim() } }));
  li.querySelector(".up").addEventListener("click", () => send("moveStep", { id: step.id, offset: -1 }));
  li.querySelector(".down").addEventListener("click", () => send("moveStep", { id: step.id, offset: 1 }));
  li.querySelector(".delete").addEventListener("click", () => send("deleteStep", { id: step.id }));
  return li;
}

function renderSteps() {
  const list = $("steps");
  const ids = new Set(steps.map((s) => s.id));
  for (const [id, el] of stepEls) {
    if (!ids.has(id)) {
      el.remove();
      stepEls.delete(id);
    }
  }

  steps.forEach((step, i) => {
    let li = stepEls.get(step.id);
    if (!li) {
      li = createStepEl(step);
      stepEls.set(step.id, li);
    }
    li.querySelector(".step-num").textContent = i + 1;
    for (const [selector, value] of [[".step-title", step.title], [".step-note", step.note]]) {
      const field = li.querySelector(selector);
      if (document.activeElement !== field) field.value = value;
    }
    const link = li.querySelector(".step-url");
    link.href = step.url;
    link.textContent = step.url;
    li.querySelector(".up").disabled = i === 0;
    li.querySelector(".down").disabled = i === steps.length - 1;
    // Only move nodes that are out of place; moving a node would blur its inputs
    if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
  });

  $("step-count").textContent = steps.length ? `(${steps.length})` : "";
  $("empty").hidden = steps.length > 0;
  $("clear-btn").hidden = steps.length === 0;
  $("create-form").hidden = steps.length === 0;

  const nameInput = $("board-name");
  if (steps.length && !nameInput.value) {
    nameInput.value = `Flow: ${hostOf(steps[0].url) || "captured steps"}`;
  }
  if (steps.length) $("create-success").hidden = true;
}

// ── Creating the board ─────────────────────────────────────────────────────

$("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("create-btn");
  btn.disabled = true;
  showError($("create-error"), "");
  const toUpload = [...steps];

  try {
    const uploaded = [];
    for (const [i, step] of toUpload.entries()) {
      btn.textContent = `Uploading screenshot ${i + 1} of ${toUpload.length}…`;
      const blob = await (await fetch(step.screenshot)).blob();
      const { url } = await api("/api/extension/screenshots", {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      uploaded.push({
        title: step.title,
        pageTitle: step.pageTitle,
        url: step.url,
        note: step.note || undefined,
        screenshotUrl: url,
      });
    }

    const aiDraft = !$("ai-draft-row").hidden && $("ai-draft").checked;
    btn.textContent = aiDraft ? "Drafting with AI… (can take a minute)" : "Creating board…";
    const projectId = $("project").value ? Number($("project").value) : undefined;
    const board = await api("/api/extension/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("board-name").value.trim(), projectId, steps: uploaded, aiDraft }),
    });

    const boardUrl = connection.baseUrl + board.url;
    chrome.tabs.create({ url: boardUrl });
    await send("clearSteps");
    $("board-name").value = "";
    const success = $("create-success");
    const aiNote = board.aiDraft?.status === "done"
      ? "Board created with an AI first draft. "
      : board.aiDraft?.status === "failed"
        ? `Board created, but without the AI draft (${board.aiDraft.message}). `
        : "Board created. ";
    success.replaceChildren(aiNote, Object.assign(document.createElement("a"), {
      href: boardUrl, target: "_blank", textContent: "Open it again ↗",
    }));
    success.hidden = false;
  } catch (err) {
    if (err.status === 401) {
      showConnect("This token no longer works. Create a new one in Blupi settings.");
    } else {
      showError($("create-error"), `Couldn't create the board: ${err.message}`);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Create board";
  }
});

// ── Start up ───────────────────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.steps) {
    steps = changes.steps.newValue || [];
    renderSteps();
  }
  if (changes.autoCapture) $("auto-capture").checked = !!changes.autoCapture.newValue;
});

(async () => {
  const stored = await chrome.storage.local.get(["connection", "steps", "autoCapture", "aiDraft"]);
  steps = stored.steps || [];
  $("auto-capture").checked = !!stored.autoCapture;
  $("ai-draft").checked = stored.aiDraft !== false; // on unless turned off
  renderSteps();
  connection = stored.connection || null;
  if (connection?.token) {
    await showMain();
  } else {
    showConnect();
  }
})();
