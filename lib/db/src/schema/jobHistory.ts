import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const jobHistoryTable = pgTable("job_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  profileId: text("profile_id").notNull(),
  jobType: text("job_type").notNull(),
  platform: text("platform"),
  url: text("url"),
  state: text("state").notNull().default("pending"),
  errorType: text("error_type"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export type JobHistory = typeof jobHistoryTable.$inferSelect;
export type InsertJobHistory = typeof jobHistoryTable.$inferInsert;

export const jobHistoryRowSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  jobType: z.string(),
  platform: z.string().nullable(),
  url: z.string().nullable(),
  state: z.string(),
  errorType: z.string().nullable(),
  errorMessage: z.string().nullable(),
  durationMs: z.number().nullable(),
  retryCount: z.number(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});
