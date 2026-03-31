import { Router, type IRouter } from "express";
import { PROFILE_TEMPLATES, generateFingerprint, type TemplateId } from "../services/fingerprintGenerator.js";

const router: IRouter = Router();

router.get("/templates", (_req, res) => {
  res.json(PROFILE_TEMPLATES);
});

router.get("/templates/:id/preview", (req, res) => {
  const template = PROFILE_TEMPLATES.find((t) => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: "not_found", message: "Template not found" });
    return;
  }
  const fp = generateFingerprint(template.id as TemplateId);
  res.json({ template, fingerprint: fp });
});

export default router;
