import type { Page } from "puppeteer-core";
import { logger } from "../lib/logger.js";
import type { LoginResult } from "./discordLogin.js";

/**
 * Instagram login workflow.
 * Checks for existing session first, then falls back to credential login.
 */
export async function executeInstagramLogin(
  page: Page,
  credentials: { email: string; password: string },
): Promise<LoginResult> {
  try {
    logger.info({ email: credentials.email }, "Instagram: checking existing session");

    await page.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    const notLoggedIn = await page.url().includes("/accounts/login");
    if (!notLoggedIn) {
      const hasAvatar = await page.$('svg[aria-label="Home"]').then(Boolean);
      if (hasAvatar) {
        logger.info({ email: credentials.email }, "Instagram: session still valid");
        return { success: true };
      }
    }

    logger.info({ email: credentials.email }, "Instagram: performing credential login");

    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: 25000,
    });

    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', credentials.email, { delay: randomDelay() });

    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.type('input[name="password"]', credentials.password, { delay: randomDelay() });

    await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/accounts/login"),
        { timeout: 15000 },
      );

      const currentUrl = page.url();
      if (currentUrl.includes("/challenge") || currentUrl.includes("/two_factor")) {
        return { success: false, reason: "2FA or challenge required", errorType: "captcha" };
      }

      logger.info({ email: credentials.email }, "Instagram: login successful");
      return { success: true };
    } catch {
      const errorText = await page.evaluate(
        new Function(`
          const el = document.querySelector('#slfErrorAlert') 
            || document.querySelector('p[data-testid="login-error-message"]')
            || document.querySelector('[class*="error"]');
          return el ? el.innerText : null;
        `) as () => string | null,
      );

      if (errorText?.toLowerCase().includes("incorrect") || errorText?.toLowerCase().includes("wrong")) {
        return { success: false, reason: errorText, errorType: "invalid_credentials" };
      }
      return { success: false, reason: errorText ?? "Login redirect timeout", errorType: "timeout" };
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
