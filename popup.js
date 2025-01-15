document.addEventListener("DOMContentLoaded", async function () {
  const websiteNameEl = document.getElementById("websiteName");
  const toggleBlockBtn = document.getElementById("toggleBlock");
  const timeRemainingEl = document.getElementById("timeRemaining");

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const hostname = url.hostname;
  websiteNameEl.textContent = hostname;

  // Check if site is blocked
  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  const blockedInfo = blockedSites?.[hostname];

  if (blockedInfo) {
    const timeLeft = blockedInfo.endTime - Date.now();
    if (timeLeft > 0) {
      document.getElementById("pauseIcon").style.display = "none";
      document.getElementById("playIcon").style.display = "block";
      websiteNameEl.classList.add("blocked");
      updateTimeRemaining(timeLeft);
    } else {
      // Block expired
      const newBlockedSites = { ...blockedSites };
      delete newBlockedSites[hostname];
      await chrome.storage.local.set({ blockedSites: newBlockedSites });
    }
  }

  /**
   * Updates the time remaining display element with the given milliseconds.
   * @param {number} ms - The time remaining in milliseconds.
   */
  function updateTimeRemaining(ms) {
    const minutes = Math.ceil(ms / 60000);
    timeRemainingEl.textContent = `Blocked for ${minutes} more minutes`;
  }

  /**
   * Toggles the blocking state of the current website.
   */
  toggleBlockBtn.addEventListener("click", async function () {
    const { blockedSites = {} } = await chrome.storage.local.get(
      "blockedSites"
    );

    if (blockedSites[hostname]) {
      // Unblock
      const newBlockedSites = { ...blockedSites };
      delete newBlockedSites[hostname];
      await chrome.storage.local.set({ blockedSites: newBlockedSites });
      document.getElementById("pauseIcon").style.display = "block";
      document.getElementById("playIcon").style.display = "none";
      websiteNameEl.classList.remove("blocked");
      timeRemainingEl.textContent = "";
    } else {
      // Block for 1 hour
      const newBlockedSites = {
        ...blockedSites,
        [hostname]: {
          endTime: Date.now() + 3600000, // 1 hour in milliseconds
        },
      };
      await chrome.storage.local.set({ blockedSites: newBlockedSites });
      document.getElementById("pauseIcon").style.display = "none";
      document.getElementById("playIcon").style.display = "block";
      websiteNameEl.classList.add("blocked");
      updateTimeRemaining(3600000);
    }
  });
});
