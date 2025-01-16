// Constants for rule IDs
const BLOCK_RULE_ID = 1;

// Initialize rules when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Clear any existing dynamic rules
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [BLOCK_RULE_ID],
  });
});

// Keep track of blocked sites and update blocking rules
async function updateBlockedSites() {
  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  if (!blockedSites) return;

  // Clean expired blocks
  const now = Date.now();
  let hasChanges = false;
  const updatedSites = { ...blockedSites };

  for (const [hostname, info] of Object.entries(blockedSites)) {
    if (info.endTime <= now) {
      delete updatedSites[hostname];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await chrome.storage.local.set({ blockedSites: updatedSites });
  }

  // Create URL patterns for blocked sites
  const patterns = Object.keys(updatedSites).map(
    (hostname) => `||${hostname}/`
  );

  // Update blocking rules for blocked sites
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [BLOCK_RULE_ID], // Remove existing rules
    addRules: patterns.length
      ? [
          // Rule to block all resources for blocked sites
          {
            id: BLOCK_RULE_ID,
            priority: 1,
            action: { type: "block" },
            condition: {
              urlFilter: patterns.join("|"),
              resourceTypes: ["main_frame", "script", "image", "stylesheet"],
            },
          },
        ]
      : [],
  });

  // Unregister Service Workers for blocked hosts
  await unregisterServiceWorkersForBlockedHosts(updatedSites);
}

// Unregister Service Workers for blocked hosts
async function unregisterServiceWorkersForBlockedHosts(blockedSites) {
  const blockedHosts = Object.keys(blockedSites);

  // Get all tabs and check for Service Workers
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url) {
      const url = new URL(tab.url);
      if (blockedHosts.includes(url.hostname)) {
        // Inject a content script to unregister the Service Worker
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: unregisterServiceWorkerForHost,
          args: [url.hostname],
        });
      }
    }
  }
}

// Function to unregister Service Workers for a specific host
function unregisterServiceWorkerForHost(hostname) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        if (new URL(registration.scope).hostname === hostname) {
          registration.unregister().then((success) => {
            if (success) {
              console.log(`Unregistered Service Worker for ${hostname}`);
            } else {
              console.log(
                `Failed to unregister Service Worker for ${hostname}`
              );
            }
          });
        }
      }
    });
  }
}

// Listen for changes to blocked sites
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedSites) {
    updateBlockedSites();
  }
});

// Check for expired blocks periodically
setInterval(updateBlockedSites, 60000); // Check every minute

// Initial setup
updateBlockedSites();
