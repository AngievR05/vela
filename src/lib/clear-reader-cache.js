import {homeCacheKey,homeQueueKey} from "./home-data.js";
import {draftKey} from "./reading-setup.js";
import {discoveryCacheKey,discoveryDraftKey} from "./validation/recommendation.js";
import {settingsCacheKey} from "./reader-settings.js";
import {statsCacheKey} from "./reading-stats.js";
import {dnaCacheKey} from "./reading-dna.js";
export function clearReaderCache(userId){
  try{for(const key of [homeCacheKey(userId),statsCacheKey(userId),dnaCacheKey(userId),homeQueueKey(userId),draftKey(userId),discoveryCacheKey(userId),discoveryDraftKey(userId),settingsCacheKey(userId),`vela:notifications:v1:${userId}`])localStorage.removeItem(key);sessionStorage.removeItem(draftKey(userId));}catch{/* Storage may be restricted. */}
}
