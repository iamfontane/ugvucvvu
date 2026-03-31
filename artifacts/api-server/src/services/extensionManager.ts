/**
 * Extension Manager
 * Manages Chrome extensions per browser profile.
 * Extensions are stored as base64-encoded CRX data or Chrome Web Store IDs.
 */

export interface ExtensionConfig {
  id: string;
  name: string;
  source: "crx_base64" | "local_path";
  data: string;
  enabled: boolean;
}

export interface ExtensionCatalogEntry {
  id: string;
  name: string;
  description: string;
  chromeId?: string;
  category: "privacy" | "proxy" | "utility" | "automation";
}

export const EXTENSION_CATALOG: ExtensionCatalogEntry[] = [
  {
    id: "ublock-origin",
    name: "uBlock Origin",
    description: "Efficient wide-spectrum content blocker",
    chromeId: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
    category: "privacy",
  },
  {
    id: "privacy-badger",
    name: "Privacy Badger",
    description: "Automatically learns to block invisible trackers",
    chromeId: "pkehgijcmpdhfbdbbnkijodmdjhbjlgp",
    category: "privacy",
  },
  {
    id: "canvas-blocker",
    name: "Canvas Blocker",
    description: "Blocks canvas fingerprinting",
    chromeId: "nomnklagbgmgghhjidfhnoelnjfndfpd",
    category: "privacy",
  },
];

/**
 * Parse extensions from profile's JSON blob.
 */
export function parseExtensions(raw: unknown): ExtensionConfig[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(isExtensionConfig);
}

function isExtensionConfig(x: unknown): x is ExtensionConfig {
  return typeof x === "object" && x !== null && "id" in x && "source" in x;
}

/**
 * Get Puppeteer launch args for loading extensions.
 * Returns args that can be passed to Puppeteer's launch config.
 */
export function getExtensionArgs(extensions: ExtensionConfig[]): string[] {
  const enabled = extensions.filter((e) => e.enabled && e.source === "local_path");
  if (enabled.length === 0) return [];

  const paths = enabled.map((e) => e.data).join(",");
  return [
    `--load-extension=${paths}`,
    `--disable-extensions-except=${paths}`,
  ];
}
