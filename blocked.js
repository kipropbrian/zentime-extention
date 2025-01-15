async function updateTimeRemaining() {
  const url = new URL(window.location.href);
  const hostname = url.searchParams.get("site") || url.hostname;

  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  const blockInfo = blockedSites?.[hostname];

  if (blockInfo) {
    const timeLeft = blockInfo.endTime - Date.now();
    if (timeLeft > 0) {
      const minutes = Math.ceil(timeLeft / 60000);
      document.getElementById(
        "timeRemaining"
      ).textContent = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      window.location.reload();
    }
  }
}

// Update time remaining every second
updateTimeRemaining();
setInterval(updateTimeRemaining, 1000);
