import type { Queue } from "bullmq";
import type { BrowserJobData } from "../workers/browserWorker.js";

/**
 * Returns a random integer between min and max (inclusive).
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Schedule a browser job with a randomized delay to prevent burst patterns.
 * Default delay range: 5–60 seconds.
 */
export async function scheduleJob(
  queue: Queue<BrowserJobData>,
  data: BrowserJobData,
  options?: {
    minDelayMs?: number;
    maxDelayMs?: number;
    fixedDelayMs?: number;
  },
) {
  const delay =
    options?.fixedDelayMs ??
    randomBetween(
      options?.minDelayMs ?? 5_000,
      options?.maxDelayMs ?? 60_000,
    );

  return queue.add("browser-job", data, { delay });
}

/**
 * Schedule a warmup job for a profile.
 */
export async function scheduleWarmup(
  queue: Queue<{ profileId: string }>,
  profileId: string,
  options?: { minDelayMs?: number; maxDelayMs?: number },
) {
  const delay = randomBetween(
    options?.minDelayMs ?? 1_000,
    options?.maxDelayMs ?? 10_000,
  );

  return queue.add("warmup", { profileId }, { delay });
}

/**
 * Schedule a health check job for a profile.
 */
export async function scheduleHealthCheck(
  queue: Queue<{ profileId: string; targetUrl?: string }>,
  profileId: string,
  targetUrl?: string,
) {
  return queue.add("health-check", { profileId, targetUrl });
}
