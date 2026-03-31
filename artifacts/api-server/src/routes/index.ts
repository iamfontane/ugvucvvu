import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import browserRouter from "./browser";
import dashboardRouter from "./dashboard";
import jobsRouter from "./jobs";
import logsRouter from "./logs";
import templatesRouter from "./templates";
import teamsRouter from "./teams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(browserRouter);
router.use(dashboardRouter);
router.use(jobsRouter);
router.use(logsRouter);
router.use(templatesRouter);
router.use(teamsRouter);

export default router;
