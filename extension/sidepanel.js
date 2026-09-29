import { APP_URL } from "./config.js";

// The panel is a frame around the real web app; this script only passes it the page
// the cook asked to cook (see src/components/EmbedHost.tsx on the app side).
const frame = document.getElementById("app");
const appOrigin = new URL(APP_URL).origin;
frame.src = `${APP_URL}/cook?embed=1`;

let latest = null;
let appReady = false;

function deliver() {
  if (!appReady || !latest) return;
  const message = latest.page ? { type: "cucinaloca:page", page: latest.page } : { type: "cucinaloca:error", message: latest.error };
  frame.contentWindow.postMessage(message, appOrigin);
}

window.addEventListener("message", (event) => {
  if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
  if (event.data?.type === "cucinaloca:ready") {
    appReady = true;
    deliver();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "page") return;
  latest = message.result;
  deliver();
});

chrome.storage.session.get("current").then(({ current }) => {
  if (current && !latest) {
    latest = current;
    deliver();
  }
});
