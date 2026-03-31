import { Worker, Queue } from "bullmq";
import { logger } from "../lib/logger.js";
import { launchBrowser } from "../services/browserLauncher.js";
import { saveSession } from "../services/sessionManager.js";
import { markProfileBusy, markProfileError, updateSession, getProfileById } from "../services/profileManager.js";
import { randomBetween } from "../services/scheduler.js";

export interface WarmupJobData {
  profileId: string;
}

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  enableOfflineQueue: false,
  connectTimeout: 5000,
  maxRetriesPerRequest: 0,
  lazyConnect: true,
};

const WARMUP_SITES = [
  "https://www.example.com",
  "https://www.wikipedia.org",
  "https://www.google.com",
];

export let warmupQueue: Queue<WarmupJobData> | null = null;

export function getWarmupQueue(): Queue<WarmupJobData> {
  if (!warmupQueue) {
    warmupQueue = new Queue<WarmupJobData>("warmup", { connection });
  }
  return warmupQueue;
}

export function startWarmupWorker() {
  try {
    warmupQueue = getWarmupQueue();

    const worker = new Worker<WarmupJobData>(
      "warmup",
      async (job) => {
        const { profileId } = job.data;
        logger.info({ jobId: job.id, profileId }, "Starting warmup job");

        const profile = await getProfileById(profileId);
        if (!profile) {
          throw new Error(`Profile ${profileId} not found`);
        }

        await markProfileBusy(profileId);

        let browser;
        try {
          const launched = await launchBrowser(profile);
          browser = launched.browser;
          const page = launched.page;

          const site = WARMUP_SITES[Math.floor(Math.random() * WARMUP_SITES.length)];
          await page.goto(site, { waitUntil: "domcontentloaded", timeout: 20000 });

          const delay = randomBetween(3000, 8000);
          await new Promise((resolve) => setTimeout(resolve, delay));

          await page.mouse.move(randomBetween(50, 300), randomBetween(100, 400));
          await new Promise((resolve) => setTimeout(resolve, randomBetween(500, 1500)));
          await page.mouse.move(randomBetween(200, 600), randomBetween(200, 500));

          await saveSession(page, profileId);

          logger.info({ jobId: job.id, profileId, site }, "Warmup complete");
        } catch (err) {
          await markProfileError(profileId);
          throw err;
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      },
      { concurrency: 5, connection },
    );

    worker.on("error", (err) => {
      logger.warn({ err }, "Warmup worker error");
    });

    logger.info("Warmup worker initialized");
    return worker;
  } catch (err) {
    logger.warn({ err }, "Warmup worker could not start — Redis not available");
    return null;
  }
}
