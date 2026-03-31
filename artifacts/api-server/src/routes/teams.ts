import { Router, type IRouter } from "express";
import { db, teamsTable, usersTable, browserProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/teams", async (_req, res) => {
  try {
    const teams = await db.select().from(teamsTable);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.post("/teams", async (req, res) => {
  try {
    const { name, description, ownerId } = req.body as { name: string; description?: string; ownerId?: string };
    if (!name) {
      res.status(400).json({ error: "validation_error", message: "name is required" });
      return;
    }
    const [team] = await db.insert(teamsTable).values({ name, description, ownerId }).returning();
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/teams/:id", async (req, res) => {
  try {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, req.params.id)).limit(1);
    if (!team) {
      res.status(404).json({ error: "not_found", message: "Team not found" });
      return;
    }
    const members = await db.select().from(usersTable).where(eq(usersTable.teamId, req.params.id));
    const profiles = await db.select({ id: browserProfilesTable.id, name: browserProfilesTable.name, status: browserProfilesTable.status, platform: browserProfilesTable.platform })
      .from(browserProfilesTable)
      .where(eq(browserProfilesTable.teamId, req.params.id));
    res.json({ ...team, members, profiles });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.delete("/teams/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(teamsTable).where(eq(teamsTable.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Team not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const users = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, teamId: usersTable.teamId, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { email, name, role, teamId } = req.body as { email: string; name: string; role?: string; teamId?: string };
    if (!email || !name) {
      res.status(400).json({ error: "validation_error", message: "email and name are required" });
      return;
    }
    const [user] = await db.insert(usersTable).values({ email, name, role: role ?? "member", teamId }).returning({
      id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, teamId: usersTable.teamId, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

export default router;
