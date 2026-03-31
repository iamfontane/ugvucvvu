import type { Page } from "puppeteer-core";
import { logger } from "../lib/logger.js";

export interface LoginResult {
  success: boolean;
  reason?: string;
  errorType?: "network" | "timeout" | "invalid_credentials" | "captcha" | "banned" | "unknown";
}

/**
 * Discord login workflow.
 * Checks for existing session first, then falls back to credential login.
 */
export async function executeDiscordLogin(
  page: Page,
  credentials: { email: string; password: string },
): Promise<LoginResult> {
  try {
    logger.info({ email: credentials.email }, "Discord: checking existing session");

    await page.goto("https://discord.com/channels/@me", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const alreadyLoggedIn = await page.url().includes("/channels/");
    if (alreadyLoggedIn) {
      logger.info({ email: credentials.email }, "Discord: session still valid");
      return { success: true };
    }

    logger.info({ email: credentials.email }, "Discord: performing credential login");

    await page.goto("https://discord.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.type('input[name="email"]', credentials.email, { delay: randomDelay() });

    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.type('input[name="password"]', credentials.password, { delay: randomDelay() });

    await page.keyboard.press("Enter");

    try {
      await page.waitForFunction(
        () => window.location.href.includes("/channels/"),
        { timeout: 15000 },
      );
      logger.info({ email: credentials.email }, "Discord: login successful");
      return { success: true };
    } catch {
      const errorText = await page.evaluate(
        new Function(`
          const el = document.querySelector('[class*="errorMessage"]') || document.querySelector('[class*="error"]');
          return el ? el.innerText : null;
        `) as () => string | null,
      );

      if (errorText?.toLowerCase().includes("invalid login")) {
        return { success: false, reason: errorText, errorType: "invalid_credentials" };
      }
      if (errorText?.toLowerCase().includes("captcha")) {
        return { success: false, reason: "CAPTCHA required", errorType: "captcha" };
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
  return Math.floor(Math.random() * 80) + 40;
}
