import { Router, type IRouter } from "express";
import {
  createProfile,
  listProfiles,
  getProfileById,
  deleteProfile,
  getAvailableProfile,
  getIdleProfilesByTag,
  updateProfileTags,
  cloneProfile,
  bulkDeleteProfiles,
  updateProfile,
  updateProfileFingerprint,
  updateProfileExtensions,
  importProfileCookies,
} from "../services/profileManager.js";
import { assignProxy } from "../services/proxyManager.js";
import { scheduleJob, scheduleWarmup, scheduleHealthCheck } from "../services/scheduler.js";
import { getBrowserQueue } from "../workers/browserWorker.js";
import { getWarmupQueue } from "../workers/warmupWorker.js";
import { getHealthQueue } from "../workers/healthWorker.js";
import { generateFingerprint, type TemplateId } from "../services/fingerprintGenerator.js";
import { EXTENSION_CATALOG } from "../services/extensionManager.js";
import type { JobWorkflow } from "../workers/browserWorker.js";

const router: IRouter = Router();
const QUEUE_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis connection timed out")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

router.get("/profiles", async (req, res) => {
  try {
    const { platform, tag } = req.query as { platform?: string; tag?: string };
    const profiles = await listProfiles({ platform, tag });
    res.json(profiles.map(sanitizeProfile));
  } catch (err) {
    req.log.error({ err }, "Failed to list profiles");
    res.status(500).json({ error: "internal_error", message: "Failed to list profiles" });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const { userId, teamId, name, email, password, platform, proxy, userAgent, tags, templateId, notes } = req.body as {
      userId?: string;
      teamId?: string;
      name?: string;
      email?: string;
      password?: string;
      platform?: string;
      proxy?: string;
      userAgent?: string;
      tags?: string[];
      templateId?: string;
      notes?: string;
    };

    const tempId = crypto.randomUUID();
    const resolvedProxy = proxy ?? assignProxy(tempId) ?? undefined;

    const fp = generateFingerprint((templateId as TemplateId | undefined) ?? "random", tempId);

    const profile = await createProfile({
      userId,
      teamId,
      name,
      email,
      password,
      platform,
      proxy: resolvedProxy,
      userAgent: userAgent ?? fp.userAgent,
      tags: tags ?? [],
      status: "idle",
      fingerprint: fp,
      templateId,
      notes,
    });

    res.status(201).json(sanitizeProfile(profile));
  } catch (err) {
    req.log.error({ err }, "Failed to create profile");
    res.status(500).json({ error: "internal_error", message: "Failed to create profile" });
  }
});

router.get("/profiles/:id", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json(sanitizeProfile(profile));
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "internal_error", message: "Failed to get profile" });
  }
});

router.delete("/profiles/:id", async (req, res) => {
  try {
    const deleted = await deleteProfile(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json({ success: true, message: "Profile deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete profile");
    res.status(500).json({ error: "internal_error", message: "Failed to delete profile" });
  }
});

router.patch("/profiles/:id/tags", async (req, res) => {
  try {
    const { tags } = req.body as { tags: string[] };
    if (!Array.isArray(tags)) {
      res.status(400).json({ error: "validation_error", message: "tags must be an array of strings" });
      return;
    }
    await updateProfileTags(req.params.id, tags);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update tags");
    res.status(500).json({ error: "internal_error", message: "Failed to update tags" });
  }
});

router.post("/profiles/:id/start", async (req, res) => {
  try {
    const { url, delayMs } = req.body as { url: string; delayMs?: number };
    if (!url) {
      res.status(400).json({ error: "validation_error", message: "url is required" });
      return;
    }

    const profile = await getAvailableProfile(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "profile_unavailable", message: `Profile ${req.params.id} not found or not idle` });
      return;
    }

    const queue = getBrowserQueue();
    const job = await withTimeout(
      scheduleJob(queue, { profileId: profile.id, url, workflow: "browse" }, { fixedDelayMs: delayMs }),
      QUEUE_TIMEOUT_MS,
    );

    res.json({ success: true, jobId: job.id, profileId: profile.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: "queue_unavailable", message: `Queue unavailable: ${message}` });
  }
});

router.post("/profiles/:id/login", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    if (!profile.email || !profile.password) {
      res.status(400).json({ error: "validation_error", message: "Profile must have email and password to perform login" });
      return;
    }
    if (!profile.platform) {
      res.status(400).json({ error: "validation_error", message: "Profile must have a platform set (discord, instagram, twitter, youtube)" });
      return;
    }

    const workflowMap: Record<string, JobWorkflow> = {
      discord: "discord-login",
      instagram: "instagram-login",
      twitter: "twitter-login",
      youtube: "youtube-login",
    };

    const workflow = workflowMap[profile.platform];
    if (!workflow) {
      res.status(400).json({ error: "validation_error", message: `Unknown platform: ${profile.platform}` });
      return;
    }

    const queue = getBrowserQueue();
    const job = await withTimeout(
      queue.add("browser-job", { profileId: profile.id, workflow },
        { attempts: 5, backoff: { type: "exponential", delay: 10000 } }),
      QUEUE_TIMEOUT_MS,
    );

    res.json({ success: true, jobId: job.id, profileId: profile.id, platform: profile.platform, workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: "queue_unavailable", message: `Queue unavailable: ${message}` });
  }
});

router.post("/profiles/batch-login", async (req, res) => {
  try {
    const { tag, platform, delayBetweenMs = 5000 } = req.body as {
      tag?: string;
      platform?: string;
      delayBetweenMs?: number;
    };

    let profiles = [];
    if (tag) {
      profiles = await getIdleProfilesByTag(tag);
    } else if (platform) {
      profiles = await listProfiles({ platform });
    } else {
      res.status(400).json({ error: "validation_error", message: "tag or platform is required" });
      return;
    }

    const queue = getBrowserQueue();
    const jobs = [];
    let cumulativeDelay = 0;

    for (const profile of profiles) {
      if (!profile.email || !profile.password || !profile.platform) continue;

      const workflowMap: Record<string, JobWorkflow> = {
        discord: "discord-login",
        instagram: "instagram-login",
        twitter: "twitter-login",
        youtube: "youtube-login",
      };

      const workflow = workflowMap[profile.platform];
      if (!workflow) continue;

      cumulativeDelay += delayBetweenMs + Math.floor(Math.random() * 3000);

      const job = await withTimeout(
        queue.add("browser-job", { profileId: profile.id, workflow }, {
          delay: cumulativeDelay,
          attempts: 5,
          backoff: { type: "exponential", delay: 10000 },
        }),
        QUEUE_TIMEOUT_MS,
      );

      jobs.push({ jobId: job.id, profileId: profile.id, workflow });
    }

    res.json({ success: true, queued: jobs.length, jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: "queue_unavailable", message: `Queue unavailable: ${message}` });
  }
});

router.post("/profiles/:id/warmup", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }

    const queue = getWarmupQueue();
    const job = await withTimeout(scheduleWarmup(queue, profile.id), QUEUE_TIMEOUT_MS);

    res.json({ success: true, jobId: job.id, profileId: profile.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: "queue_unavailable", message: `Queue unavailable: ${message}` });
  }
});

router.post("/profiles/:id/healthcheck", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }

    const { targetUrl } = req.body as { targetUrl?: string };
    const queue = getHealthQueue();
    const job = await withTimeout(scheduleHealthCheck(queue, profile.id, targetUrl), QUEUE_TIMEOUT_MS);

    res.json({ success: true, jobId: job.id, profileId: profile.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: "queue_unavailable", message: `Queue unavailable: ${message}` });
  }
});

// ─── Profile PATCH (update fields) ──────────────────────────────────────────
router.patch("/profiles/:id", async (req, res) => {
  try {
    const { name, notes, tags, proxy, platform, teamId } = req.body as {
      name?: string;
      notes?: string;
      tags?: string[];
      proxy?: string;
      platform?: string;
      teamId?: string;
    };
    const updated = await updateProfile(req.params.id, { name, notes, tags, proxy, platform, teamId });
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json(sanitizeProfile(updated as Record<string, unknown>));
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "internal_error", message: "Failed to update profile" });
  }
});

// ─── Clone profile ────────────────────────────────────────────────────────────
router.post("/profiles/:id/clone", async (req, res) => {
  try {
    const cloned = await cloneProfile(req.params.id);
    if (!cloned) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.status(201).json(sanitizeProfile(cloned as Record<string, unknown>));
  } catch (err) {
    req.log.error({ err }, "Failed to clone profile");
    res.status(500).json({ error: "internal_error", message: "Failed to clone profile" });
  }
});

// ─── Bulk delete ──────────────────────────────────────────────────────────────
router.post("/profiles/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "validation_error", message: "ids must be a non-empty array" });
      return;
    }
    const deleted = await bulkDeleteProfiles(ids);
    res.json({ success: true, deleted: deleted.length, ids: deleted });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk delete profiles");
    res.status(500).json({ error: "internal_error", message: "Failed to bulk delete profiles" });
  }
});

// ─── Fingerprint management ───────────────────────────────────────────────────
router.patch("/profiles/:id/fingerprint", async (req, res) => {
  try {
    const fingerprint = req.body;
    if (!fingerprint || typeof fingerprint !== "object") {
      res.status(400).json({ error: "validation_error", message: "Fingerprint object required" });
      return;
    }
    const updated = await updateProfileFingerprint(req.params.id, fingerprint);
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json({ success: true, fingerprint: updated.fingerprint });
  } catch (err) {
    req.log.error({ err }, "Failed to update fingerprint");
    res.status(500).json({ error: "internal_error", message: "Failed to update fingerprint" });
  }
});

router.post("/profiles/:id/fingerprint/regenerate", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    const { templateId } = req.body as { templateId?: string };
    const fp = generateFingerprint((templateId ?? profile.templateId) as TemplateId | undefined);
    const updated = await updateProfileFingerprint(req.params.id, fp);
    res.json({ success: true, fingerprint: updated?.fingerprint });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate fingerprint");
    res.status(500).json({ error: "internal_error", message: "Failed to regenerate fingerprint" });
  }
});

// ─── Extensions management ────────────────────────────────────────────────────
router.get("/profiles/extensions/catalog", (_req, res) => {
  res.json(EXTENSION_CATALOG);
});

router.patch("/profiles/:id/extensions", async (req, res) => {
  try {
    const { extensions } = req.body as { extensions: unknown[] };
    if (!Array.isArray(extensions)) {
      res.status(400).json({ error: "validation_error", message: "extensions must be an array" });
      return;
    }
    const updated = await updateProfileExtensions(req.params.id, extensions);
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json({ success: true, extensions: updated.extensions });
  } catch (err) {
    req.log.error({ err }, "Failed to update extensions");
    res.status(500).json({ error: "internal_error", message: "Failed to update extensions" });
  }
});

// ─── Cookie import / export ───────────────────────────────────────────────────
router.post("/profiles/:id/cookies/import", async (req, res) => {
  try {
    const { cookies } = req.body as { cookies: unknown[] };
    if (!Array.isArray(cookies)) {
      res.status(400).json({ error: "validation_error", message: "cookies must be an array" });
      return;
    }
    const updated = await importProfileCookies(req.params.id, cookies);
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    res.json({ success: true, count: cookies.length });
  } catch (err) {
    req.log.error({ err }, "Failed to import cookies");
    res.status(500).json({ error: "internal_error", message: "Failed to import cookies" });
  }
});

router.get("/profiles/:id/cookies/export", async (req, res) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    const cookies = Array.isArray(profile.cookies) ? profile.cookies : [];
    res.json({ profileId: profile.id, cookies, count: cookies.length });
  } catch (err) {
    req.log.error({ err }, "Failed to export cookies");
    res.status(500).json({ error: "internal_error", message: "Failed to export cookies" });
  }
});

function sanitizeProfile(profile: Record<string, unknown>) {
  const { password, ...safe } = profile;
  return safe;
}

export default router;
