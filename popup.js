document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");

  // Load initial tracking state
  chrome.runtime.sendMessage({ action: "getTrackingState" }, (res) => {
    statusEl.innerText = res?.trackingEnabled ? "Status: Tracking started" : "Status: Idle";
  });

  // Start tracking
  document.getElementById("startBtn").onclick = () => {
    chrome.runtime.sendMessage({ action: "setTrackingState", value: true }, () => {
      statusEl.innerText = "Status: Tracking started";
    });
  };

  // Stop tracking
  document.getElementById("stopBtn").onclick = () => {
    chrome.runtime.sendMessage({ action: "setTrackingState", value: false }, () => {
      statusEl.innerText = "Status: Tracking stopped";
    });
  };
});