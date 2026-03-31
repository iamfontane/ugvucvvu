import { db, jobHistoryTable, type InsertJobHistory } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function createJobRecord(data: Omit<InsertJobHistory, "id" | "createdAt">) {
  const [record] = await db
    .insert(jobHistoryTable)
    .values(data)
    .returning();
  return record;
}

export async function finishJobRecord(
  id: string,
  result: {
    state: "completed" | "failed";
    errorType?: string | null;
    errorMessage?: string | null;
    durationMs?: number;
    retryCount?: number;
  },
) {
  await db
    .update(jobHistoryTable)
    .set({
      state: result.state,
      errorType: result.errorType ?? null,
      errorMessage: result.errorMessage ?? null,
      durationMs: result.durationMs,
      retryCount: result.retryCount ?? 0,
      finishedAt: new Date(),
    })
    .where(eq(jobHistoryTable.id, id));
}

export async function listJobHistory(limit = 100) {
  return db
    .select()
    .from(jobHistoryTable)
    .orderBy(desc(jobHistoryTable.createdAt))
    .limit(limit);
}

export async function listJobHistoryForProfile(profileId: string, limit = 50) {
  return db
    .select()
    .from(jobHistoryTable)
    .where(eq(jobHistoryTable.profileId, profileId))
    .orderBy(desc(jobHistoryTable.createdAt))
    .limit(limit);
}
