// Clicking the toolbar icon opens the side panel and reads the recipe from the current tab.
// activeTab grants access to that one tab for that one click: no standing access to any site.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.action.onClicked.addListener((tab) => {
  // Open first, while the click still counts as a user gesture.
  chrome.sidePanel.open({ windowId: tab.windowId });
  readPage(tab).then(async (result) => {
    await chrome.storage.session.set({ current: result });
    // The panel may not be listening yet; it also reads storage when it starts.
    chrome.runtime.sendMessage({ type: "page", result }).catch(() => {});
  });
});

async function readPage(tab) {
  if (!tab.url || !/^https?:/.test(tab.url)) {
    return { error: "Open a recipe on a website, then click the Cucina Loca icon." };
  }
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extract });
    return { page: result };
  } catch {
    return { error: "Chrome doesn't let extensions read this page." };
  }
}

// Runs inside the recipe page. Only reads; changes nothing.
function extract() {
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || "").slice(0, 20);
  const root = document.querySelector("article") || document.querySelector("main") || document.body;
  return {
    url: location.href.split("#")[0],
    title: document.title.slice(0, 500),
    siteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.slice(0, 200) || null,
    jsonLd: jsonLd.filter((t) => t.length <= 500000),
    text: (root?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 60000),
  };
}
