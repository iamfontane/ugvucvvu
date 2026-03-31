import { Router, type IRouter } from "express";
import { getLogs } from "../lib/logStore.js";

const router: IRouter = Router();

router.get("/logs/live", (req, res) => {
  const sinceRaw = req.query["since"];
  const limitRaw = req.query["limit"];
  const since = sinceRaw !== undefined ? Number(sinceRaw) : undefined;
  const limit = limitRaw !== undefined ? Math.min(Number(limitRaw), 500) : 100;
  const entries = getLogs(since, limit);
  res.json({ entries });
});

export default router;
