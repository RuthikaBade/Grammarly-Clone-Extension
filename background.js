console.log("[BG] Background service worker loaded");

// Initialize tracking state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ trackingEnabled: false });
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request.action) return;

  switch (request.action) {
    case "setTrackingState":
      chrome.storage.local.set({ trackingEnabled: request.value }, () => {
        console.log("[BG] Tracking state updated:", request.value);
        sendResponse({ success: true });
      });
      return true; // MUST return true for async sendResponse

    case "getTrackingState":
      chrome.storage.local.get("trackingEnabled", (data) => {
        sendResponse({ trackingEnabled: data.trackingEnabled });
      });
      return true;

    case "getSuggestions":
      fetchSuggestionsFromAPI(request.text).then((corrections) => {
        sendResponse({ corrections });
      }).catch((err) => {
        console.error("[BG] API error:", err);
        sendResponse({ corrections: [], error: "Error fetching suggestions." });
      });
      return true; // MUST return true for async sendResponse

    default:
      console.warn("[BG] Unknown action:", request.action);
  }
});

// ======= Call FastAPI /check endpoint =======
async function fetchSuggestionsFromAPI(text) {
  console.log("[BG] Sending text to FastAPI backend:", text);

  const response = await fetch("http://127.0.0.1:5000/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: "auto" })
  });

  const data = await response.json();
  console.log("[BG] Backend response:", data);

  return data.corrections || [];
}
