import type { Page } from "puppeteer-core";
import { logger } from "../lib/logger.js";
import type { LoginResult } from "./discordLogin.js";

/**
 * YouTube/Google login workflow.
 * Signs into Google account which provides YouTube access.
 */
export async function executeYoutubeLogin(
  page: Page,
  credentials: { email: string; password: string },
): Promise<LoginResult> {
  try {
    logger.info({ email: credentials.email }, "YouTube: checking existing session");

    await page.goto("https://www.youtube.com/", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    const signInButton = await page.$('a[href*="accounts.google.com"]');
    const avatarButton = await page.$('button#avatar-btn');

    if (avatarButton) {
      logger.info({ email: credentials.email }, "YouTube: session still valid");
      return { success: true };
    }

    if (!signInButton) {
      logger.info({ email: credentials.email }, "YouTube: session still valid (no sign in button)");
      return { success: true };
    }

    logger.info({ email: credentials.email }, "YouTube: performing Google login");

    await page.goto(
      `https://accounts.google.com/signin/v2/identifier?service=youtube&flowEntry=ServiceLogin`,
      { waitUntil: "networkidle2", timeout: 25000 },
    );

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', credentials.email, { delay: randomDelay() });

    await page.waitForSelector('#identifierNext', { timeout: 5000 });
    await page.click('#identifierNext');

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', credentials.password, { delay: randomDelay() });

    await page.waitForSelector('#passwordNext', { timeout: 5000 });
    await page.click('#passwordNext');

    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }),
        page.waitForFunction(
          () => window.location.hostname.includes("youtube.com") || window.location.hostname.includes("google.com/myaccount"),
          { timeout: 20000 },
        ),
      ]);

      const finalUrl = page.url();

      if (finalUrl.includes("challenge") || finalUrl.includes("signin/v2/challenge")) {
        return { success: false, reason: "Google security challenge required", errorType: "captcha" };
      }
      if (finalUrl.includes("2step") || finalUrl.includes("two-factor")) {
        return { success: false, reason: "2FA required", errorType: "captcha" };
      }

      logger.info({ email: credentials.email }, "YouTube: Google login successful");
      return { success: true };
    } catch {
      const errorText = await page.evaluate(
        new Function(`
          const el = document.querySelector('[jsname="B34EJ"]') 
            || document.querySelector('.o6cuMc')
            || document.querySelector('[data-error-code]');
          return el ? el.innerText : null;
        `) as () => string | null,
      );

      if (errorText?.includes("Wrong") || errorText?.includes("incorrect")) {
        return { success: false, reason: errorText, errorType: "invalid_credentials" };
      }
      return { success: false, reason: errorText ?? "Google login timeout", errorType: "timeout" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorType = msg.includes("timeout") ? "timeout"
      : msg.includes("net::") ? "network"
      : "unknown";
    return { success: false, reason: msg, errorType };
  }
}

function randomDelay(): number {
  return Math.floor(Math.random() * 100) + 50;
}
