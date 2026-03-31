import { pgTable, text, jsonb, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const browserProfilesTable = pgTable("browser_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),
  teamId: text("team_id"),
  name: text("name"),
  email: text("email"),
  password: text("password"),
  platform: text("platform"),
  proxy: text("proxy"),
  userAgent: text("user_agent"),
  cookies: jsonb("cookies"),
  localStorage: jsonb("local_storage"),
  tags: text("tags").array(),
  status: text("status").notNull().default("idle"),
  failureCount: integer("failure_count").notNull().default(0),
  failureReason: text("failure_reason"),
  needsAttention: boolean("needs_attention").notNull().default(false),
  lastValidated: timestamp("last_validated"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  fingerprint: jsonb("fingerprint"),
  templateId: text("template_id"),
  extensions: jsonb("extensions"),
  notes: text("notes"),
});

export const insertBrowserProfileSchema = createInsertSchema(
  browserProfilesTable,
).omit({ id: true, createdAt: true, lastUsed: true, failureCount: true, needsAttention: true });

export type InsertBrowserProfile = z.infer<typeof insertBrowserProfileSchema>;
export type BrowserProfile = typeof browserProfilesTable.$inferSelect;
