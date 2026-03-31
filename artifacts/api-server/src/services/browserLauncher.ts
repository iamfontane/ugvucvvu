import puppeteer from "puppeteer-core";
import type { BrowserProfile } from "@workspace/db";
import { restoreSession } from "./sessionManager.js";
import { injectFingerprint } from "./fingerprintInjector.js";
import { generateFingerprint, type TemplateId, type BrowserFingerprint } from "./fingerprintGenerator.js";
import { parseExtensions, getExtensionArgs } from "./extensionManager.js";

const ENDPOINTS: string[] = (
  process.env.BROWSERLESS_ENDPOINTS ??
  "ws://localhost:3000,ws://localhost:3001,ws://localhost:3002"
).split(",").map((e) => e.trim());

function getEndpoint(): string {
  return ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
}

function getFingerprint(profile: BrowserProfile): BrowserFingerprint {
  if (profile.fingerprint && typeof profile.fingerprint === "object") {
    return profile.fingerprint as BrowserFingerprint;
  }
  return generateFingerprint(
    (profile.templateId as TemplateId | undefined) ?? "random",
    profile.id,
  );
}

export async function launchBrowser(profile: BrowserProfile) {
  const fp = getFingerprint(profile);

  const args: string[] = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-notifications",
    "--disable-popup-blocking",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-translate",
    "--metrics-recording-only",
    "--safebrowsing-disable-auto-update",
    "--password-store=basic",
    "--use-mock-keychain",
    `--window-size=${fp.screenWidth},${fp.screenHeight}`,
    `--enforce-webrtc-ip-permission-check`,
    `--webrtc-ip-handling-policy=${fp.webrtcPolicy}`,
    "--disable-features=WebRtcHideLocalIpsWithMdns",
    `--lang=${fp.language}`,
    `--accept-lang=${fp.languages.join(",")}`,
  ];

  if (profile.proxy) {
    args.push(`--proxy-server=${profile.proxy}`);
  }

  const extensions = parseExtensions(profile.extensions);
  const extensionArgs = getExtensionArgs(extensions);
  args.push(...extensionArgs);

  const browser = await puppeteer.connect({
    browserWSEndpoint: getEndpoint(),
    ...(args.length > 0 ? { args } : {}),
  });

  const page = await browser.newPage();

  const ua = fp.userAgent || profile.userAgent;
  if (ua) {
    await page.setUserAgent(ua);
  }

  await page.emulateTimezone(fp.timezone).catch(() => {});

  const cdpSession = await page.createCDPSession();

  await cdpSession.send("Emulation.setLocaleOverride", { locale: fp.language }).catch(() => {});

  await cdpSession.send("Network.setUserAgentOverride", {
    userAgent: fp.userAgent,
    platform: fp.platform,
    acceptLanguage: fp.languages.join(","),
  }).catch(() => {});

  await cdpSession.send("Emulation.setDeviceMetricsOverride", {
    width: fp.screenWidth,
    height: fp.screenHeight,
    deviceScaleFactor: fp.pixelRatio,
    mobile: false,
  }).catch(() => {});

  await injectFingerprint(page, fp);

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    const win = window as Record<string, unknown>;
    delete win["cdc_adoQpoasnfa76pfcZLmcfl_Array"];
    delete win["cdc_adoQpoasnfa76pfcZLmcfl_Promise"];
    delete win["cdc_adoQpoasnfa76pfcZLmcfl_Symbol"];
  });

  await restoreSession(page, profile);

  return { browser, page, fingerprint: fp };
}
