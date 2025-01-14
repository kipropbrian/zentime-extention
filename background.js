// First, declare rules to redirect blocked sites to our blocking page
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1], // Remove existing rule if any
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame"],
        },
      },
    ],
  });
});

// Keep track of blocked sites and update redirect rules
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

  // Create URL pattern for each blocked site
  const patterns = Object.keys(updatedSites).map(
    (hostname) => `*://${hostname}/*`
  );

  // Update blocking rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: patterns.length
      ? [
          {
            id: 1,
            priority: 1,
            action: {
              type: "redirect",
              redirect: { extensionPath: "/blocked.html" },
            },
            condition: {
              urlFilter: patterns.join("|"),
              resourceTypes: ["main_frame"],
            },
          },
        ]
      : [],
  });
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
