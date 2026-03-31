import { Router, type IRouter } from "express";
import { getAvailableProfile } from "../services/profileManager.js";
import { getBrowserQueue } from "../workers/browserWorker.js";

const router: IRouter = Router();

const REDIS_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis connection timed out")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

router.post("/browser/start", async (req, res) => {
  try {
    const { url, profileId } = req.body as { url: string; profileId?: string };

    if (!url) {
      res.status(400).json({ error: "validation_error", message: "url is required" });
      return;
    }

    const profile = await getAvailableProfile(profileId);

    if (!profile) {
      res.status(404).json({
        error: "no_profile_available",
        message: profileId
          ? `Profile ${profileId} not found or not idle`
          : "No idle profiles available. Create one first.",
      });
      return;
    }

    const queue = getBrowserQueue();
    const job = await withTimeout(
      queue.add("browser-job", { profileId: profile.id, url }),
      REDIS_TIMEOUT_MS,
    );

    res.json({
      success: true,
      jobId: job.id,
      profileId: profile.id,
      message: `Job queued for profile ${profile.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to start browser job");
    res.status(503).json({
      error: "queue_unavailable",
      message: `Queue unavailable: ${message}. Ensure Redis is running at REDIS_HOST:REDIS_PORT.`,
    });
  }
});

router.get("/browser/jobs", async (req, res) => {
  try {
    const queue = getBrowserQueue();

    const [waiting, active, completed, failed] = await withTimeout(
      Promise.all([
        queue.getJobs(["waiting"]),
        queue.getJobs(["active"]),
        queue.getJobs(["completed"], 0, 50),
        queue.getJobs(["failed"], 0, 50),
      ]),
      REDIS_TIMEOUT_MS,
    );

    const all = [...waiting, ...active, ...completed, ...failed].map((j) => ({
      id: j.id,
      profileId: (j.data as { profileId: string }).profileId,
      url: (j.data as { url: string }).url,
      state: j.opts ? "queued" : "unknown",
      createdAt: j.timestamp ? new Date(j.timestamp).toISOString() : new Date().toISOString(),
      finishedAt: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
      error: j.failedReason ?? null,
    }));

    res.json(all);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to list jobs");
    res.status(503).json({
      error: "queue_unavailable",
      message: `Queue unavailable: ${message}. Ensure Redis is running at REDIS_HOST:REDIS_PORT.`,
    });
  }
});

export default router;
