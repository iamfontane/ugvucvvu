import { Worker, Queue } from "bullmq";
import { logger } from "../lib/logger.js";
import { launchBrowser } from "../services/browserLauncher.js";
import { saveSession } from "../services/sessionManager.js";
import {
  getProfileById,
  markProfileBusy,
  updateSession,
  markProfileError,
} from "../services/profileManager.js";
import { classifyError, getBackoffDelay, shouldRetry } from "../services/retryClassifier.js";
import { createJobRecord, finishJobRecord } from "../services/jobHistoryService.js";
import { executeDiscordLogin } from "../workflows/discordLogin.js";
import { executeInstagramLogin } from "../workflows/instagramLogin.js";
import { executeTwitterLogin } from "../workflows/twitterLogin.js";
import { executeYoutubeLogin } from "../workflows/youtubeLogin.js";

export type JobWorkflow = "browse" | "login" | "discord-login" | "instagram-login" | "twitter-login" | "youtube-login";

export interface BrowserJobData {
  profileId: string;
  url?: string;
  workflow?: JobWorkflow;
}

export interface BrowserJobResult {
  success: boolean;
  error?: string;
  errorType?: string;
}

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  enableOfflineQueue: false,
  connectTimeout: 5000,
  maxRetriesPerRequest: 0,
  lazyConnect: true,
};

export let browserQueue: Queue<BrowserJobData> | null = null;

export function getBrowserQueue(): Queue<BrowserJobData> {
  if (!browserQueue) {
    browserQueue = new Queue<BrowserJobData>("browser-jobs", { connection });
  }
  return browserQueue;
}

export function startBrowserWorker() {
  try {
    browserQueue = getBrowserQueue();

    const worker = new Worker<BrowserJobData, BrowserJobResult>(
      "browser-jobs",
      async (job) => {
        const { profileId, url, workflow = "browse" } = job.data;
        const startTime = Date.now();

        logger.info({ jobId: job.id, profileId, workflow }, "Starting browser job");

        const profile = await getProfileById(profileId);
        if (!profile) throw new Error(`Profile ${profileId} not found`);

        await markProfileBusy(profileId);

        const historyId = (await createJobRecord({
          profileId,
          jobType: workflow,
          platform: profile.platform ?? derivePlatform(workflow),
          url: url ?? null,
          state: "running",
          retryCount: job.attemptsMade,
        })).id;

        let browser;
        try {
          const launched = await launchBrowser(profile);
          browser = launched.browser;
          const page = launched.page;

          let loginResult;

          if (workflow === "discord-login" || (workflow === "login" && profile.platform === "discord")) {
            if (!profile.email || !profile.password) throw new Error("Missing email/password for Discord login");
            loginResult = await executeDiscordLogin(page, { email: profile.email, password: profile.password });
          } else if (workflow === "instagram-login" || (workflow === "login" && profile.platform === "instagram")) {
            if (!profile.email || !profile.password) throw new Error("Missing email/password for Instagram login");
            loginResult = await executeInstagramLogin(page, { email: profile.email, password: profile.password });
          } else if (workflow === "twitter-login" || (workflow === "login" && profile.platform === "twitter")) {
            if (!profile.email || !profile.password) throw new Error("Missing email/password for Twitter login");
            loginResult = await executeTwitterLogin(page, { email: profile.email, password: profile.password });
          } else if (workflow === "youtube-login" || (workflow === "login" && profile.platform === "youtube")) {
            if (!profile.email || !profile.password) throw new Error("Missing email/password for YouTube login");
            loginResult = await executeYoutubeLogin(page, { email: profile.email, password: profile.password });
          } else {
            if (!url) throw new Error("url is required for browse workflow");
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            loginResult = { success: true };
          }

          if (!loginResult.success) {
            const classified = classifyError(loginResult.reason, loginResult.errorType);
            const durationMs = Date.now() - startTime;

            await finishJobRecord(historyId, {
              state: "failed",
              errorType: classified.type,
              errorMessage: loginResult.reason ?? "Login failed",
              durationMs,
              retryCount: job.attemptsMade,
            });

            await markProfileError(profileId, loginResult.reason, loginResult.errorType);

            if (!shouldRetry(classified, profile.failureCount ?? 0)) {
              logger.warn({ jobId: job.id, profileId, errorType: classified.type }, "Non-recoverable login failure — no retry");
              return { success: false, error: loginResult.reason, errorType: classified.type };
            }

            throw new Error(loginResult.reason ?? "Login failed");
          }

          await saveSession(page, profileId);

          const durationMs = Date.now() - startTime;
          await finishJobRecord(historyId, { state: "completed", durationMs, retryCount: job.attemptsMade });

          logger.info({ jobId: job.id, profileId, workflow, durationMs }, "Browser job completed");
          return { success: true };
        } catch (err) {
          const classified = classifyError(err);
          const durationMs = Date.now() - startTime;

          await finishJobRecord(historyId, {
            state: "failed",
            errorType: classified.type,
            errorMessage: classified.message,
            durationMs,
            retryCount: job.attemptsMade,
          });

          await markProfileError(profileId, classified.message, classified.type);

          logger.error({ jobId: job.id, profileId, err }, "Browser job failed");

          if (!shouldRetry(classified, (profile.failureCount ?? 0) + 1)) {
            return { success: false, error: classified.message, errorType: classified.type };
          }

          throw err;
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      },
      {
        concurrency: 5,
        connection,
        limiter: { max: 10, duration: 60_000 },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "custom" },
        },
      },
    );

    worker.on("failed", (job, err) => {
      const failureCount = (job?.attemptsMade ?? 0) + 1;
      const delay = getBackoffDelay(failureCount);
      logger.error({ jobId: job?.id, failureCount, nextDelayMs: delay, err }, "Browser job failed, backing off");
    });

    worker.on("error", (err) => {
      logger.warn({ err }, "Browser worker error (Redis may not be available)");
    });

    logger.info("Browser worker initialized");
    return worker;
  } catch (err) {
    logger.warn({ err }, "Browser worker could not start — Redis not available");
    return null;
  }
}

function derivePlatform(workflow: string): string | null {
  if (workflow.includes("discord")) return "discord";
  if (workflow.includes("instagram")) return "instagram";
  if (workflow.includes("twitter")) return "twitter";
  if (workflow.includes("youtube")) return "youtube";
  return null;
}
