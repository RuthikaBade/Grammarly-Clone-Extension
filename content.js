console.log("[CONTENT] Grammar Helper Loaded ✅");

let composeBox = null;
let observer = null;
let trackingEnabled = false;
let debounceTimer = null;
let suggestionQueue = [];
let isShowingSuggestion = false;
let updateLocked = false;

// ======================
// SAVE / RESTORE CURSOR
// ======================
function saveCursorPosition() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  return selection.getRangeAt(0).cloneRange();
}

function restoreCursorPosition(range) {
  if (!range) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// ======================
// CHECK IF FIELD IS SUPPORTED
// ======================
function isFieldSupported(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
  if (el.isContentEditable) return true;
  return false; // Avoid complex editors
}

// ======================
// FIND AND TRACK FOCUS
// ======================
function trackFields() {
  document.addEventListener("focusin", (e) => {
    if (!trackingEnabled) return;
    if (!isFieldSupported(e.target)) return;
    composeBox = e.target;
    attachObserver();
  });
}

// ======================
// OBSERVER FOR ANY FIELD
// ======================
function attachObserver() {
  if (!composeBox || !trackingEnabled) return;
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    if (updateLocked) return;

    let text = "";
    if (composeBox.isContentEditable) {
      text = composeBox.innerText.trim();
    } else if (composeBox.tagName === "TEXTAREA" || composeBox.tagName === "INPUT") {
      text = composeBox.value.trim();
    }

    if (text.length > 0) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        requestSuggestions(text);
      }, 800);
    }
  });

  observer.observe(composeBox, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// ======================
// REQUEST SUGGESTIONS
// ======================
function requestSuggestions(text) {
  chrome.runtime.sendMessage({ action: "getSuggestions", text }, (response) => {
    if (response?.corrections?.length > 0) {
      suggestionQueue = response.corrections;
      showHighlights(response.corrections);
      if (!isShowingSuggestion) showNextSuggestion();
    }
  });
}

// ======================
// SHOW HIGHLIGHTS (ONLY VISUAL, NO AUTO REPLACE)
// ======================
function showHighlights(corrections) {
  if (!composeBox) return;
  updateLocked = true;

  // Clear previous highlights
  composeBox.querySelectorAll?.(".gh-error")?.forEach(el => el.remove());

  corrections.forEach(correction => {
    // Only show popup on click, do NOT replace automatically
    // For simplicity, user clicks "Replace Word / Sentence"
  });

  updateLocked = false;
}

// ======================
// POPUP FOR SUGGESTIONS
// ======================
let currentPopup = null;
function showSuggestionPopup(anchorEl, correction) {
  if (currentPopup) currentPopup.remove();

  const popup = document.createElement("div");
  currentPopup = popup;

  Object.assign(popup.style, {
    position: "absolute",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: "99999",
    fontSize: "13px",
    whiteSpace: "nowrap"
  });

  popup.innerHTML = `
    <div>🔹 <b>${correction.original}</b> → ${correction.correction}</div>
    <button id="replaceWordBtn" style="margin-top:4px;padding:2px 6px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">
      Replace Word
    </button>
    <button id="replaceSentenceBtn" style="margin-top:4px;margin-left:6px;padding:2px 6px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">
      Replace Sentence
    </button>
  `;

  document.body.appendChild(popup);

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  popup.querySelector("#replaceWordBtn").onclick = () => {
    if (composeBox.isContentEditable) {
      const text = composeBox.innerText.replace(correction.original, correction.correction);
      composeBox.innerText = text;
    } else {
      composeBox.value = composeBox.value.replace(correction.original, correction.correction);
    }
    popup.remove();
  };

  popup.querySelector("#replaceSentenceBtn").onclick = () => {
    if (composeBox.isContentEditable) {
      const text = composeBox.innerText.replace(correction.original, correction.correction);
      composeBox.innerText = text;
    } else {
      composeBox.value = composeBox.value.replace(correction.original, correction.correction);
    }
    popup.remove();
  };
}

// ======================
// SHOW SUGGESTIONS ONE BY ONE
// ======================
function showNextSuggestion() {
  if (suggestionQueue.length === 0) {
    isShowingSuggestion = false;
    return;
  }

  isShowingSuggestion = true;
  const current = suggestionQueue.shift();

  // Show popup on first available field
  showSuggestionPopup(composeBox, current);
  setTimeout(() => showNextSuggestion(), 1500);
}

// ======================
// INITIAL LOAD
// ======================
chrome.storage.local.get("trackingEnabled", (data) => {
  trackingEnabled = data.trackingEnabled || false;
  if (trackingEnabled) trackFields();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.trackingEnabled) {
    trackingEnabled = changes.trackingEnabled.newValue;
    if (trackingEnabled) trackFields();
  }
});
