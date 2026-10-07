import { dnaCacheKey } from "./reading-dna.js";
import { discoveryCacheKey } from "./validation/recommendation.js";
export const activityEventKey = userId => `vela:activity-change:v1:${userId}`;
export function notifyReadingActivity(userId) {
  try {
    localStorage.removeItem(dnaCacheKey(userId));
    localStorage.removeItem(discoveryCacheKey(userId));
    localStorage.setItem(activityEventKey(userId), JSON.stringify({at:Date.now(),nonce:Math.random()}));
  } catch { /* The same-tab event still works without storage. */ }
  window.dispatchEvent(new CustomEvent("vela:dna-changed", {detail:{userId}}));
}
