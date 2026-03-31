/**
 * Proxy Manager — sticky proxy assignment per profile.
 *
 * Proxies are loaded from the PROXY_LIST environment variable as a
 * comma-separated list of proxy URLs, e.g.:
 *   PROXY_LIST=http://user:pass@ip1:port,http://user:pass@ip2:port
 *
 * Each profile is deterministically assigned to one proxy via a hash of its ID
 * so the same profile always uses the same proxy across restarts.
 */

const RAW = process.env.PROXY_LIST ?? "";

const proxyPool: string[] = RAW
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

/**
 * Simple deterministic hash of a string → non-negative integer.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Assign a sticky proxy to the given profile ID.
 * Returns null if no proxies are configured.
 */
export function assignProxy(profileId: string): string | null {
  if (proxyPool.length === 0) return null;
  const index = hashString(profileId) % proxyPool.length;
  return proxyPool[index];
}

/**
 * Returns all configured proxies.
 */
export function listProxies(): string[] {
  return [...proxyPool];
}

/**
 * Returns true if at least one proxy is configured.
 */
export function hasProxies(): boolean {
  return proxyPool.length > 0;
}
