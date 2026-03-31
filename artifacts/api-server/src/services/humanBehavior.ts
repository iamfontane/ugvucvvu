/**
 * Human Behavior Simulation
 * Realistic mouse movement, scrolling, and typing patterns to evade behavioral analysis.
 */

import type { Page } from "puppeteer-core";

/** Sleep for a random amount of time in the range [min, max] ms */
export async function randomSleep(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simulate realistic human typing with variable delays and occasional pauses */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.focus(selector);
  await randomSleep(100, 300);

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const delay = Math.floor(Math.random() * 120) + 40;

    await page.keyboard.type(char, { delay });

    if (Math.random() < 0.03) {
      await randomSleep(300, 800);
    }
    if (Math.random() < 0.01 && i > 0) {
      await page.keyboard.press("Backspace");
      await randomSleep(100, 250);
      await page.keyboard.type(char, { delay: Math.floor(Math.random() * 80) + 40 });
    }
  }
  await randomSleep(80, 200);
}

/** Move mouse in a realistic curved path using Bezier-like interpolation */
export async function humanMove(page: Page, targetX: number, targetY: number): Promise<void> {
  const current = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));

  const steps = Math.floor(Math.random() * 20) + 15;
  const dx = targetX - current.x;
  const dy = targetY - current.y;

  const cp1x = current.x + dx * (0.3 + Math.random() * 0.2) + (Math.random() - 0.5) * 60;
  const cp1y = current.y + dy * (0.2 + Math.random() * 0.2) + (Math.random() - 0.5) * 60;
  const cp2x = current.x + dx * (0.6 + Math.random() * 0.2) + (Math.random() - 0.5) * 40;
  const cp2y = current.y + dy * (0.7 + Math.random() * 0.2) + (Math.random() - 0.5) * 40;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt ** 3 * current.x + 3 * mt ** 2 * t * cp1x + 3 * mt * t ** 2 * cp2x + t ** 3 * targetX;
    const y = mt ** 3 * current.y + 3 * mt ** 2 * t * cp1y + 3 * mt * t ** 2 * cp2y + t ** 3 * targetY;
    await page.mouse.move(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 12) + 4));
  }
}

/** Simulate realistic scrolling behavior */
export async function humanScroll(page: Page, pixels: number, direction: "down" | "up" = "down"): Promise<void> {
  const totalScrolls = Math.floor(Math.abs(pixels) / 100) + 1;
  const sign = direction === "down" ? 1 : -1;

  for (let i = 0; i < totalScrolls; i++) {
    const amount = (Math.floor(Math.random() * 80) + 40) * sign;
    await page.evaluate((scrollY) => window.scrollBy(0, scrollY), amount);
    await randomSleep(50, 200);

    if (Math.random() < 0.1) {
      await randomSleep(500, 1500);
    }
  }
}

/** Click on an element with human-like behavior: move, hover, then click */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const el = await page.$(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);

  const box = await el.boundingBox();
  if (!box) throw new Error(`Element not visible: ${selector}`);

  const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
  const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

  await humanMove(page, targetX, targetY);
  await randomSleep(50, 150);
  await page.mouse.click(targetX, targetY);
  await randomSleep(80, 200);
}

/** Simulate page reading behavior: scroll down gradually with pauses */
export async function simulateReading(page: Page, durationMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await humanScroll(page, Math.floor(Math.random() * 200) + 50);
    await randomSleep(800, 2500);

    if (Math.random() < 0.2) {
      await humanScroll(page, Math.floor(Math.random() * 100) + 30, "up");
      await randomSleep(500, 1500);
    }
  }
}

/** Warm-up: visit a set of normal-looking pages to build browsing history feel */
export async function warmupBrowsing(page: Page, urls: string[]): Promise<void> {
  for (const url of urls) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await randomSleep(1500, 4000);
    await simulateReading(page, Math.floor(Math.random() * 5000) + 2000);
  }
}
