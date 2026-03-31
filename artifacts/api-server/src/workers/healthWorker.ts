import { Worker, Queue } from "bullmq";
import { logger } from "../lib/logger.js";
import { launchBrowser } from "../services/browserLauncher.js";
import { checkSessionAt } from "../services/healthChecker.js";
import { markProfileBusy, markProfileError, updateSession, getProfileById } from "../services/profileManager.js";
import { db, browserProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface HealthJobData {
  profileId: string;
  targetUrl?: string;
}

export interface HealthJobResult {
  alive: boolean;
  reason?: string;
}

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  enableOfflineQueue: false,
  connectTimeout: 5000,
  maxRetriesPerRequest: 0,
  lazyConnect: true,
};

const DEFAULT_CHECK_URL = process.env.HEALTH_CHECK_URL ?? "https://www.example.com";

export let healthQueue: Queue<HealthJobData> | null = null;

export function getHealthQueue(): Queue<HealthJobData> {
  if (!healthQueue) {
    healthQueue = new Queue<HealthJobData>("health-check", { connection });
  }
  return healthQueue;
}

export function startHealthWorker() {
  try {
    healthQueue = getHealthQueue();

    const worker = new Worker<HealthJobData, HealthJobResult>(
      "health-check",
      async (job) => {
        const { profileId, targetUrl } = job.data;
        logger.info({ jobId: job.id, profileId }, "Starting health check");

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

          const result = await checkSessionAt(page, targetUrl ?? DEFAULT_CHECK_URL);

          if (result.alive) {
            await db
              .update(browserProfilesTable)
              .set({ status: "idle", lastUsed: new Date() })
              .where(eq(browserProfilesTable.id, profileId));
          } else {
            await markProfileError(profileId);
          }

          logger.info(
            { jobId: job.id, profileId, alive: result.alive, reason: result.reason },
            "Health check complete",
          );

          return result;
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
      logger.warn({ err }, "Health worker error");
    });

    logger.info("Health worker initialized");
    return worker;
  } catch (err) {
    logger.warn({ err }, "Health worker could not start — Redis not available");
    return null;
  }
}
