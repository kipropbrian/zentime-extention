const MAX_BLOCK_TIME = 36000000; // 10 hours in milliseconds
document.addEventListener("DOMContentLoaded", async function () {
  const websiteNameEl = document.getElementById("websiteName");
  const toggleBlockBtn = document.getElementById("toggleBlock");
  const timeRemainingEl = document.getElementById("timeRemaining");
  const blockedSitesListEl = document.getElementById("blockedSitesList");
  const blockIconSvg = document.getElementById("blockIconSvg");
  const playIcon = document.getElementById("playIcon");

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
      blockIconSvg.style.display = "block"; // Show block icon
      playIcon.style.display = "none"; // Hide play icon
      websiteNameEl.classList.add("blocked");
      updateTimeRemaining(timeLeft);
    } else {
      // Block expired
      const newBlockedSites = { ...blockedSites };
      delete newBlockedSites[hostname];
      await chrome.storage.local.set({ blockedSites: newBlockedSites });
    }
  }

  // Display the list of blocked sites
  renderBlockedSitesList(blockedSites);

  /**
   * Updates the time remaining display element with the given milliseconds.
   * @param {number} ms - The time remaining in milliseconds.
   */
  function updateTimeRemaining(ms) {
    const minutes = Math.ceil(ms / 60000);
    timeRemainingEl.textContent = `Blocked for ${minutes} more minutes`;
  }

  /**
   * Renders the list of blocked sites.
   * @param {Object} blockedSites - The list of blocked sites.
   */
  function renderBlockedSitesList(blockedSites) {
    blockedSitesListEl.innerHTML = ""; // Clear the list

    if (!blockedSites || Object.keys(blockedSites).length === 0) {
      blockedSitesListEl.innerHTML = "<p>No sites are currently blocked.</p>";
      return;
    }

    for (const [hostname, info] of Object.entries(blockedSites)) {
      const timeLeft = info.endTime - Date.now();
      if (timeLeft > 0) {
        const minutes = Math.ceil(timeLeft / 60000);
        const siteEl = document.createElement("div");
        siteEl.className = "blocked-site";
        siteEl.innerHTML = `
          <span>${hostname}</span>
          <span>${minutes} minute${minutes !== 1 ? "s" : ""} left</span>
          <button class="unblock-btn" data-hostname="${hostname}">Unblock</button>
        `;
        blockedSitesListEl.appendChild(siteEl);
      }
    }

    // Add event listeners to unblock buttons
    const unblockButtons = document.querySelectorAll(".unblock-btn");
    unblockButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const hostname = button.getAttribute("data-hostname");
        const { blockedSites } = await chrome.storage.local.get("blockedSites");
        const newBlockedSites = { ...blockedSites };
        delete newBlockedSites[hostname];
        await chrome.storage.local.set({ blockedSites: newBlockedSites });
        renderBlockedSitesList(newBlockedSites); // Refresh the list
      });
    });
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
      blockIconSvg.style.display = "none"; // Hide block icon
      playIcon.style.display = "block"; // Show play icon
      websiteNameEl.classList.remove("blocked");
      timeRemainingEl.textContent = "";
    } else {
      // Block for 10 hour
      const newBlockedSites = {
        ...blockedSites,
        [hostname]: {
          endTime: Date.now() + MAX_BLOCK_TIME, // 10 hour in milliseconds
        },
      };
      await chrome.storage.local.set({ blockedSites: newBlockedSites });
      blockIconSvg.style.display = "block"; // Show block icon
      playIcon.style.display = "none"; // Hide play icon
      websiteNameEl.classList.add("blocked");
      updateTimeRemaining(MAX_BLOCK_TIME);
    }

    // Refresh the list of blocked sites
    const updatedBlockedSites = await chrome.storage.local.get("blockedSites");
    renderBlockedSitesList(updatedBlockedSites.blockedSites);
  });
});
