import { Router, type IRouter } from "express";
import { listJobHistory, listJobHistoryForProfile } from "../services/jobHistoryService.js";

const router: IRouter = Router();

router.get("/jobs/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const jobs = await listJobHistory(limit);
    res.json(jobs.map(serializeJob));
  } catch (err) {
    req.log.error({ err }, "Failed to list job history");
    res.status(500).json({ error: "internal_error", message: "Failed to list job history" });
  }
});

router.get("/jobs/history/profile/:profileId", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const jobs = await listJobHistoryForProfile(req.params.profileId, limit);
    res.json(jobs.map(serializeJob));
  } catch (err) {
    req.log.error({ err }, "Failed to list profile job history");
    res.status(500).json({ error: "internal_error", message: "Failed to list profile job history" });
  }
});

function serializeJob(job: Record<string, unknown>) {
  return {
    ...job,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
    finishedAt: job.finishedAt instanceof Date ? (job.finishedAt as Date).toISOString() : job.finishedAt,
  };
}

export default router;
