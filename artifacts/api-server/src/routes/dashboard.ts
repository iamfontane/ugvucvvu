import { Router, type IRouter } from "express";
import { db, browserProfilesTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { getBrowserQueue } from "../workers/browserWorker.js";
import { getWarmupQueue } from "../workers/warmupWorker.js";
import { getHealthQueue } from "../workers/healthWorker.js";

const router: IRouter = Router();
const QUEUE_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [totalResult, idleResult, busyResult, errorResult, attentionResult] = await Promise.all([
      db.select({ count: count() }).from(browserProfilesTable),
      db.select({ count: count() }).from(browserProfilesTable).where(eq(browserProfilesTable.status, "idle")),
      db.select({ count: count() }).from(browserProfilesTable).where(eq(browserProfilesTable.status, "busy")),
      db.select({ count: count() }).from(browserProfilesTable).where(eq(browserProfilesTable.status, "error")),
      db.select({ count: count() }).from(browserProfilesTable).where(eq(browserProfilesTable.needsAttention, true)),
    ]);

    const platformRows = await db
      .select({ platform: browserProfilesTable.platform, count: count() })
      .from(browserProfilesTable)
      .groupBy(browserProfilesTable.platform);

    const platformStats: Record<string, number> = {};
    for (const row of platformRows) {
      if (row.platform) platformStats[row.platform] = Number(row.count);
    }

    const baseStats = {
      totalProfiles: Number(totalResult[0]?.count ?? 0),
      idleProfiles: Number(idleResult[0]?.count ?? 0),
      busyProfiles: Number(busyResult[0]?.count ?? 0),
      errorProfiles: Number(errorResult[0]?.count ?? 0),
      needsAttention: Number(attentionResult[0]?.count ?? 0),
      platformStats,
    };

    try {
      const queue = getBrowserQueue();
      const warmup = getWarmupQueue();
      const health = getHealthQueue();

      const [jobCounts, warmupCounts, healthCounts] = await withTimeout(
        Promise.all([
          queue.getJobCounts("waiting", "active", "completed", "failed"),
          warmup.getJobCounts("waiting", "active"),
          health.getJobCounts("waiting", "active"),
        ]),
        QUEUE_TIMEOUT_MS,
      );

      res.json({
        ...baseStats,
        queueAvailable: true,
        pendingJobs: (jobCounts.waiting ?? 0) + (warmupCounts.waiting ?? 0) + (healthCounts.waiting ?? 0),
        activeJobs: (jobCounts.active ?? 0) + (warmupCounts.active ?? 0) + (healthCounts.active ?? 0),
        completedJobs: jobCounts.completed ?? 0,
        failedJobs: jobCounts.failed ?? 0,
      });
    } catch {
      res.json({
        ...baseStats,
        queueAvailable: false,
        pendingJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "internal_error", message: "Failed to get stats" });
  }
});

export default router;
