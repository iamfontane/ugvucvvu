import type { Page } from "puppeteer-core";

export interface HealthCheckResult {
  alive: boolean;
  reason?: string;
  currentUrl?: string;
}

/**
 * Check whether a browser session appears to be alive and authenticated.
 *
 * The checks are intentionally generic — you can extend this with
 * site-specific selectors for your target platforms.
 */
export async function checkSessionHealth(page: Page): Promise<HealthCheckResult> {
  const currentUrl = page.url();

  const loginPatterns = ["login", "signin", "sign-in", "auth", "session-expired", "logout"];
  const isOnLoginPage = loginPatterns.some((p) => currentUrl.toLowerCase().includes(p));

  if (isOnLoginPage) {
    return {
      alive: false,
      reason: "Session redirected to login page",
      currentUrl,
    };
  }

  try {
    const hasUserIndicator = await page.evaluate(
      new Function(`
        return (
          !!document.querySelector('[data-user]') ||
          !!document.querySelector('[data-userid]') ||
          !!document.querySelector('.user-avatar') ||
          !!document.querySelector('.user-menu') ||
          !!document.querySelector('[data-testid="user-menu"]')
        );
      `) as () => boolean,
    );

    if (!hasUserIndicator) {
      return {
        alive: false,
        reason: "No authenticated user indicator found on page",
        currentUrl,
      };
    }
  } catch {
    return { alive: false, reason: "Page evaluation failed", currentUrl };
  }

  return { alive: true, currentUrl };
}

/**
 * Navigate to a target URL and check if the session is still valid.
 */
export async function checkSessionAt(
  page: Page,
  targetUrl: string,
): Promise<HealthCheckResult> {
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    return await checkSessionHealth(page);
  } catch (err) {
    return {
      alive: false,
      reason: `Navigation failed: ${err instanceof Error ? err.message : String(err)}`,
      currentUrl: targetUrl,
    };
  }
}
