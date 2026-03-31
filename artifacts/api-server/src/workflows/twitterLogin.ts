import type { Page } from "puppeteer-core";
import { logger } from "../lib/logger.js";
import type { LoginResult } from "./discordLogin.js";

/**
 * Twitter/X login workflow.
 * Multi-step flow: username/email → password.
 */
export async function executeTwitterLogin(
  page: Page,
  credentials: { email: string; password: string },
): Promise<LoginResult> {
  try {
    logger.info({ email: credentials.email }, "Twitter: checking existing session");

    await page.goto("https://x.com/home", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    const redirectedToLogin = page.url().includes("/i/flow/login") || page.url().includes("/login");
    if (!redirectedToLogin) {
      logger.info({ email: credentials.email }, "Twitter: session still valid");
      return { success: true };
    }

    logger.info({ email: credentials.email }, "Twitter: performing credential login");

    await page.goto("https://x.com/i/flow/login", {
      waitUntil: "networkidle2",
      timeout: 25000,
    });

    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
    await page.type('input[autocomplete="username"]', credentials.email, { delay: randomDelay() });

    const nextBtn = await page.waitForSelector('[data-testid="LoginForm_Login_Button"], [role="button"]:has-text("Next")', {
      timeout: 5000,
    }).catch(() => null);

    if (nextBtn) {
      await nextBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await page.type('input[name="password"]', credentials.password, { delay: randomDelay() });

    const loginBtn = await page.waitForSelector('[data-testid="LoginForm_Login_Button"]', {
      timeout: 5000,
    }).catch(() => null);

    if (loginBtn) {
      await loginBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    try {
      await page.waitForFunction(
        () => window.location.href.includes("/home") && !window.location.href.includes("/i/flow"),
        { timeout: 20000 },
      );
      logger.info({ email: credentials.email }, "Twitter: login successful");
      return { success: true };
    } catch {
      const currentUrl = page.url();
      if (currentUrl.includes("/i/flow/login_verification") || currentUrl.includes("two-factor")) {
        return { success: false, reason: "2FA required", errorType: "captcha" };
      }

      const errorText = await page.evaluate(
        new Function(`
          const el = document.querySelector('[data-testid="LoginForm_Error_Text"]')
            || document.querySelector('[class*="error"]');
          return el ? el.innerText : null;
        `) as () => string | null,
      );
      if (errorText?.includes("Wrong") || errorText?.includes("Incorrect")) {
        return { success: false, reason: errorText, errorType: "invalid_credentials" };
      }
      return { success: false, reason: errorText ?? "Login flow timeout", errorType: "timeout" };
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
  return Math.floor(Math.random() * 120) + 60;
}
