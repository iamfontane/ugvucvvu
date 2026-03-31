/**
 * Fingerprint Generator
 * Creates realistic, unique browser fingerprints to prevent cross-profile linking.
 * Each fingerprint mimics a real device/browser combination.
 */

export interface BrowserFingerprint {
  // OS + Browser
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  platform: string;
  vendor: string;

  // Screen
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;

  // Hardware
  cpuCores: number;
  deviceMemory: number;

  // Locale
  timezone: string;
  language: string;
  languages: string[];

  // WebGL
  webglVendor: string;
  webglRenderer: string;

  // Audio fingerprint noise seed (0-1)
  audioNoiseSeed: number;

  // Canvas noise seed (0-255)
  canvasNoiseSeed: number;

  // Fonts available (subset)
  fonts: string[];

  // WebRTC
  webrtcPolicy: "disable-non-proxied-udp" | "default-public-interface-only" | "disable";

  // Touch
  touchPoints: number;

  // Connection
  connectionType: string;
  connectionRtt: number;
  connectionDownlink: number;
}

const WINDOWS_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

const MAC_USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0",
];

const LINUX_USER_AGENTS = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

const WEBGL_VENDORS = [
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Apple Inc.", renderer: "Apple M1" },
  { vendor: "Apple Inc.", renderer: "Apple M2" },
  { vendor: "Apple GPU", renderer: "Apple M1 Pro" },
  { vendor: "Intel Inc.", renderer: "Intel Iris OpenGL Engine" },
  { vendor: "Mesa/X.org", renderer: "Mesa Intel(R) UHD Graphics 620 (WHL GT2)" },
];

const SCREEN_CONFIGS = [
  { width: 1920, height: 1080, ratio: 1 },
  { width: 2560, height: 1440, ratio: 1 },
  { width: 1366, height: 768, ratio: 1 },
  { width: 1440, height: 900, ratio: 2 },
  { width: 2560, height: 1600, ratio: 2 },
  { width: 1280, height: 800, ratio: 2 },
  { width: 1680, height: 1050, ratio: 1 },
  { width: 1920, height: 1200, ratio: 1 },
  { width: 3840, height: 2160, ratio: 2 },
  { width: 2880, height: 1800, ratio: 2 },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Amsterdam", "Europe/Madrid", "Europe/Rome",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore",
  "Australia/Sydney", "Australia/Melbourne", "America/Sao_Paulo",
];

const COMMON_FONTS = [
  "Arial", "Arial Black", "Arial Narrow", "Calibri", "Cambria", "Comic Sans MS",
  "Courier New", "Georgia", "Helvetica", "Impact", "Lucida Console",
  "Lucida Sans Unicode", "Microsoft Sans Serif", "Palatino Linotype",
  "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Wingdings",
  "Segoe UI", "Segoe UI Symbol", "Segoe UI Emoji",
  "Apple SD Gothic Neo", "Helvetica Neue",
  "Ubuntu", "DejaVu Sans", "Liberation Sans",
];

const MAC_FONTS = [
  ...COMMON_FONTS,
  "San Francisco", "SF Pro", "SF Compact", "New York", "Helvetica Neue",
  "Apple Chancery", "Futura", "Optima", "Baskerville",
];

const WIN_FONTS = [
  ...COMMON_FONTS,
  "Franklin Gothic Medium", "Century Gothic", "Garamond", "Book Antiqua",
  "Gill Sans MT", "Candara", "Constantia",
];

function pick<T>(arr: T[], seed?: number): T {
  if (seed !== undefined) {
    return arr[Math.floor(seed * arr.length) % arr.length]!;
  }
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function sampleFonts(allFonts: string[], seed: number, count: number): string[] {
  const shuffled = [...allFonts].sort((a, b) => seededRandom(seed + a.charCodeAt(0)) - seededRandom(seed + b.charCodeAt(0)));
  return shuffled.slice(0, count);
}

export type TemplateId =
  | "windows-chrome-us"
  | "windows-chrome-eu"
  | "mac-chrome"
  | "mac-safari"
  | "mac-firefox"
  | "windows-firefox"
  | "linux-chrome"
  | "linux-firefox"
  | "random";

export interface ProfileTemplate {
  id: TemplateId;
  name: string;
  description: string;
  os: string;
  browser: string;
  icon: string;
}

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  { id: "windows-chrome-us", name: "Windows / Chrome (US)", description: "Windows 10/11, Chrome, US timezone", os: "windows", browser: "chrome", icon: "🪟" },
  { id: "windows-chrome-eu", name: "Windows / Chrome (EU)", description: "Windows 10/11, Chrome, European timezone", os: "windows", browser: "chrome", icon: "🪟" },
  { id: "mac-chrome", name: "macOS / Chrome", description: "macOS Ventura/Sonoma, Chrome", os: "mac", browser: "chrome", icon: "🍎" },
  { id: "mac-safari", name: "macOS / Safari", description: "macOS, Safari 17", os: "mac", browser: "safari", icon: "🍎" },
  { id: "mac-firefox", name: "macOS / Firefox", description: "macOS, Firefox 122", os: "mac", browser: "firefox", icon: "🍎" },
  { id: "windows-firefox", name: "Windows / Firefox", description: "Windows 10, Firefox 122", os: "windows", browser: "firefox", icon: "🪟" },
  { id: "linux-chrome", name: "Linux / Chrome", description: "Ubuntu Linux, Chrome", os: "linux", browser: "chrome", icon: "🐧" },
  { id: "linux-firefox", name: "Linux / Firefox", description: "Ubuntu Linux, Firefox", os: "linux", browser: "firefox", icon: "🐧" },
  { id: "random", name: "Random", description: "Randomized realistic fingerprint", os: "random", browser: "random", icon: "🎲" },
];

/**
 * Generate a realistic browser fingerprint, optionally seeded by profile ID.
 */
export function generateFingerprint(templateId?: TemplateId, profileIdSeed?: string): BrowserFingerprint {
  const seed = profileIdSeed
    ? Array.from(profileIdSeed).reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1000000);

  const r = (offset = 0) => seededRandom(seed + offset);

  const tpl = templateId ?? "random";

  let os: string;
  let userAgentPool: string[];
  let fontPool: string[];
  let timezone: string;
  let language: string;
  let languages: string[];

  if (tpl === "windows-chrome-us" || tpl === "windows-firefox") {
    os = "windows";
    userAgentPool = WINDOWS_USER_AGENTS.filter(ua =>
      tpl === "windows-firefox" ? ua.includes("Firefox") : ua.includes("Chrome")
    );
    fontPool = WIN_FONTS;
    timezone = pick(["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"], r(1));
    language = "en-US";
    languages = ["en-US", "en"];
  } else if (tpl === "windows-chrome-eu") {
    os = "windows";
    userAgentPool = WINDOWS_USER_AGENTS.filter(ua => ua.includes("Chrome"));
    fontPool = WIN_FONTS;
    timezone = pick(["Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam"], r(1));
    language = pick(["en-GB", "de-DE", "fr-FR", "nl-NL"], r(2));
    languages = [language, "en"];
  } else if (tpl === "mac-chrome" || tpl === "mac-firefox" || tpl === "mac-safari") {
    os = "mac";
    userAgentPool = MAC_USER_AGENTS.filter(ua =>
      tpl === "mac-firefox" ? ua.includes("Firefox") :
      tpl === "mac-safari" ? ua.includes("Safari") && !ua.includes("Chrome") :
      ua.includes("Chrome")
    );
    fontPool = MAC_FONTS;
    timezone = pick(TIMEZONES, r(1));
    language = "en-US";
    languages = ["en-US", "en"];
  } else if (tpl === "linux-chrome" || tpl === "linux-firefox") {
    os = "linux";
    userAgentPool = LINUX_USER_AGENTS.filter(ua =>
      tpl === "linux-firefox" ? ua.includes("Firefox") : ua.includes("Chrome")
    );
    fontPool = COMMON_FONTS;
    timezone = pick(TIMEZONES, r(1));
    language = "en-US";
    languages = ["en-US", "en"];
  } else {
    os = pick(["windows", "mac", "linux"], r(0));
    userAgentPool = os === "windows" ? WINDOWS_USER_AGENTS : os === "mac" ? MAC_USER_AGENTS : LINUX_USER_AGENTS;
    fontPool = os === "windows" ? WIN_FONTS : os === "mac" ? MAC_FONTS : COMMON_FONTS;
    timezone = pick(TIMEZONES, r(1));
    language = pick(["en-US", "en-GB", "de-DE", "fr-FR"], r(2));
    languages = [language, "en"];
  }

  const userAgent = userAgentPool.length > 0 ? pick(userAgentPool, r(3)) : pick(WINDOWS_USER_AGENTS, r(3));

  const screen = pick(SCREEN_CONFIGS, r(4));
  const webgl = pick(WEBGL_VENDORS, r(5));

  const osVersions: Record<string, string[]> = {
    windows: ["10.0", "11.0"],
    mac: ["10_15_7", "14_1", "14_2", "13_6"],
    linux: ["x86_64"],
  };
  const osVersion = pick(osVersions[os] ?? ["10.0"], r(6));

  const browserMatch = userAgent.match(/Chrome\/([\d.]+)|Firefox\/([\d.]+)|Version\/([\d.]+)/);
  const browserVersion = browserMatch?.[1] ?? browserMatch?.[2] ?? browserMatch?.[3] ?? "121.0";

  const browserName = userAgent.includes("Firefox") ? "firefox" :
                      userAgent.includes("Safari") && !userAgent.includes("Chrome") ? "safari" : "chrome";

  const platformStr = os === "windows" ? "Win32" : os === "mac" ? "MacIntel" : "Linux x86_64";
  const vendorStr = browserName === "safari" ? "Apple Computer, Inc." :
                    browserName === "firefox" ? "" : "Google Inc.";

  const cpuOptions = [2, 4, 6, 8, 12, 16];
  const memOptions = [4, 8, 16, 32];
  const touchPoints = os === "windows" && r(7) > 0.7 ? pick([1, 5, 10], r(8)) : 0;

  const connectionTypes = ["wifi", "ethernet", "4g"];
  const connType = pick(connectionTypes, r(9));
  const rttMap: Record<string, number> = { wifi: pick([20, 50, 80, 100], r(10)), ethernet: pick([5, 10, 20], r(11)), "4g": pick([80, 150, 200], r(12)) };

  const fontCount = Math.floor(r(13) * 10) + 12;
  const fonts = sampleFonts(fontPool, seed, fontCount);

  return {
    os,
    osVersion,
    browser: browserName,
    browserVersion,
    userAgent,
    platform: platformStr,
    vendor: vendorStr,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: 24,
    pixelRatio: screen.ratio,
    cpuCores: pick(cpuOptions, r(14)),
    deviceMemory: pick(memOptions, r(15)),
    timezone,
    language,
    languages,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    audioNoiseSeed: r(16),
    canvasNoiseSeed: Math.floor(r(17) * 255),
    fonts,
    webrtcPolicy: "disable-non-proxied-udp",
    touchPoints,
    connectionType: connType,
    connectionRtt: rttMap[connType] ?? 50,
    connectionDownlink: pick([10, 25, 50, 100], r(18)),
  };
}
