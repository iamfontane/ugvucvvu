import type { Page } from "puppeteer-core";

export async function captureSession(page: Page) {
  const cookies = await page.cookies();

  const localStorageData = await page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(`
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    `) as () => Record<string, string>,
  );

  return { cookies, localStorage: localStorageData };
}
