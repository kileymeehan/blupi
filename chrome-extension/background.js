// Captures screenshots of the current tab and keeps the list of steps.
//
// The background worker is the only thing that writes `steps` to storage, so a
// capture and an edit from the side panel can never overwrite each other. The
// side panel sends messages here and re-renders from storage changes.

const MAX_WIDTH = 1600; // screenshots are scaled down to keep uploads small
const JPEG_QUALITY = 0.8;
const AUTO_SETTLE_MS = 800; // let the page finish drawing before an auto capture
const MIN_CAPTURE_GAP_MS = 600; // Chrome allows ~2 captures per second

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

async function getSteps() {
  const { steps = [] } = await chrome.storage.local.get("steps");
  return steps;
}

async function setSteps(steps) {
  await chrome.storage.local.set({ steps });
  chrome.action.setBadgeText({ text: steps.length ? String(steps.length) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#302E87" });
}

// Updates run one after another so two changes can't read the same old list
let queue = Promise.resolve();
function updateSteps(change) {
  const run = queue.then(async () => setSteps(await change(await getSteps())));
  queue = run.catch(() => {});
  return run;
}

function toDataUrl(blob) {
  return blob.arrayBuffer().then((buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
  });
}

async function shrink(dataUrl) {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return toDataUrl(await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY }));
}

const isCapturable = (url) => /^https?:/.test(url || "");

let lastCaptureAt = 0;
let lastAutoUrl = null;

async function captureStep(tab) {
  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  if (!tab || !isCapturable(tab.url)) {
    throw new Error("Open a website to capture it (Chrome's own pages can't be captured).");
  }

  const wait = MIN_CAPTURE_GAP_MS - (Date.now() - lastCaptureAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCaptureAt = Date.now();

  const raw = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 90 });
  const screenshot = await shrink(raw);
  const pageTitle = (tab.title || "").trim().slice(0, 300);
  const step = {
    id: crypto.randomUUID(),
    title: pageTitle,
    pageTitle, // kept so Blupi can tell whether the step was renamed
    url: tab.url,
    note: "",
    screenshot,
    capturedAt: Date.now(),
  };
  await updateSteps((steps) => [...steps, step]);
  return step;
}

// ── Auto-capture: a new step whenever the visible page changes ─────────────

async function maybeAutoCapture(tabId) {
  const { autoCapture } = await chrome.storage.local.get("autoCapture");
  if (!autoCapture) return;
  await new Promise((r) => setTimeout(r, AUTO_SETTLE_MS));
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  // Only the tab on screen can be captured
  if (!tab || !tab.active || !isCapturable(tab.url) || tab.url === lastAutoUrl) return;
  const win = await chrome.windows.get(tab.windowId).catch(() => null);
  if (!win?.focused) return;
  lastAutoUrl = tab.url;
  captureStep(tab).catch((err) => console.warn("[Blupi] Auto-capture skipped:", err.message));
}

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "complete") maybeAutoCapture(tabId);
});

// Single-page apps change the URL without a full page load
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) maybeAutoCapture(details.tabId);
});

chrome.storage.onChanged.addListener((changes) => {
  // Turning auto mode on shouldn't skip the page you're already on
  if (changes.autoCapture?.newValue) lastAutoUrl = null;
});

// ── Keyboard shortcut ──────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-step") {
    captureStep().catch((err) => console.warn("[Blupi] Capture failed:", err.message));
  }
});

// ── Messages from the side panel ───────────────────────────────────────────

const handlers = {
  capture: () => captureStep(),
  updateStep: ({ id, changes }) =>
    updateSteps((steps) => steps.map((s) => (s.id === id ? { ...s, ...changes } : s))),
  deleteStep: ({ id }) => updateSteps((steps) => steps.filter((s) => s.id !== id)),
  moveStep: ({ id, offset }) =>
    updateSteps((steps) => {
      const from = steps.findIndex((s) => s.id === id);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= steps.length) return steps;
      const next = [...steps];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    }),
  clearSteps: () => updateSteps(() => []),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;
  handler(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // respond asynchronously
});

// Restore the badge after the browser restarts
getSteps().then(setSteps);
