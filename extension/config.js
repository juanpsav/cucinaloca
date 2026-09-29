// Where the side panel loads the app from. Chrome Web Store installs have an update_url;
// an unpacked (development) copy doesn't, so it talks to `npm run dev` instead.
const isStoreInstall = "update_url" in chrome.runtime.getManifest();

export const APP_URL = isStoreInstall ? "https://cucinaloca.com" : "http://localhost:3000";
