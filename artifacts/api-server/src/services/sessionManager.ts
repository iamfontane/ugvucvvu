import type { Page } from "puppeteer-core";
import type { BrowserProfile } from "@workspace/db";
import { updateSession } from "./profileManager.js";

/**
 * Restore a profile's saved session (cookies + localStorage) onto a page.
 */
export async function restoreSession(page: Page, profile: BrowserProfile): Promise<void> {
  if (Array.isArray(profile.cookies) && profile.cookies.length > 0) {
    await page.setCookie(...(profile.cookies as Parameters<typeof page.setCookie>));
  }

  if (profile.localStorage && typeof profile.localStorage === "object") {
    await page.evaluate((storage: Record<string, string>) => {
      for (const [key, value] of Object.entries(storage)) {
        localStorage.setItem(key, value);
      }
    }, profile.localStorage as Record<string, string>);
  }
}

/**
 * Capture and persist the current session state for a profile.
 */
export async function saveSession(page: Page, profileId: string): Promise<void> {
  const cookies = await page.cookies();

  const localStorageData = await page.evaluate(
    new Function(`
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) data[key] = localStorage.getItem(key) || '';
      }
      return data;
    `) as () => Record<string, string>,
  );

  await updateSession(profileId, cookies, localStorageData);
}
