import { eq, inArray, sql } from "drizzle-orm";
import { db, browserProfilesTable, type InsertBrowserProfile } from "@workspace/db";
import type { BrowserFingerprint } from "./fingerprintGenerator.js";

export async function createProfile(data: InsertBrowserProfile) {
  const [profile] = await db
    .insert(browserProfilesTable)
    .values(data)
    .returning();
  return profile;
}

export async function listProfiles(filters?: { platform?: string; tag?: string }) {
  if (filters?.platform) {
    return db
      .select()
      .from(browserProfilesTable)
      .where(eq(browserProfilesTable.platform, filters.platform));
  }
  if (filters?.tag) {
    return db
      .select()
      .from(browserProfilesTable)
      .where(sql`${filters.tag} = ANY(${browserProfilesTable.tags})`);
  }
  return db.select().from(browserProfilesTable);
}

export async function getProfileById(id: string) {
  const [profile] = await db
    .select()
    .from(browserProfilesTable)
    .where(eq(browserProfilesTable.id, id))
    .limit(1);
  return profile ?? null;
}

export async function getAvailableProfile(preferredId?: string, platform?: string) {
  if (preferredId) {
    const [profile] = await db
      .select()
      .from(browserProfilesTable)
      .where(eq(browserProfilesTable.id, preferredId))
      .limit(1);
    if (profile && profile.status === "idle") return profile;
    return null;
  }

  const conditions = [eq(browserProfilesTable.status, "idle")];
  if (platform) {
    return (await db
      .select()
      .from(browserProfilesTable)
      .where(eq(browserProfilesTable.platform, platform)))[0] ?? null;
  }

  const [profile] = await db
    .select()
    .from(browserProfilesTable)
    .where(eq(browserProfilesTable.status, "idle"))
    .limit(1);
  return profile ?? null;
}

export async function getIdleProfilesByTag(tag: string) {
  return db
    .select()
    .from(browserProfilesTable)
    .where(
      sql`status = 'idle' AND ${tag} = ANY(${browserProfilesTable.tags})`
    );
}

export async function markProfileBusy(profileId: string) {
  await db
    .update(browserProfilesTable)
    .set({ status: "busy" })
    .where(eq(browserProfilesTable.id, profileId));
}

export async function updateSession(
  profileId: string,
  cookies: unknown,
  localStorage: unknown,
) {
  await db
    .update(browserProfilesTable)
    .set({
      cookies,
      localStorage,
      lastUsed: new Date(),
      lastValidated: new Date(),
      status: "idle",
      failureCount: 0,
      failureReason: null,
      needsAttention: false,
    })
    .where(eq(browserProfilesTable.id, profileId));
}

export async function markProfileError(
  profileId: string,
  reason?: string,
  errorType?: string,
) {
  const profile = await getProfileById(profileId);
  if (!profile) return;

  const newFailureCount = (profile.failureCount ?? 0) + 1;
  const needsAttention = newFailureCount >= 3;

  await db
    .update(browserProfilesTable)
    .set({
      status: needsAttention ? "error" : "idle",
      failureCount: newFailureCount,
      failureReason: errorType ?? reason ?? "unknown",
      needsAttention,
    })
    .where(eq(browserProfilesTable.id, profileId));
}

export async function updateProfileTags(profileId: string, tags: string[]) {
  await db
    .update(browserProfilesTable)
    .set({ tags })
    .where(eq(browserProfilesTable.id, profileId));
}

export async function deleteProfile(id: string) {
  const [deleted] = await db
    .delete(browserProfilesTable)
    .where(eq(browserProfilesTable.id, id))
    .returning();
  return deleted ?? null;
}

export async function bulkDeleteProfiles(ids: string[]) {
  if (ids.length === 0) return [];
  const deleted = await db
    .delete(browserProfilesTable)
    .where(inArray(browserProfilesTable.id, ids))
    .returning({ id: browserProfilesTable.id });
  return deleted.map((r) => r.id);
}

export async function cloneProfile(id: string): Promise<typeof browserProfilesTable.$inferSelect | null> {
  const source = await getProfileById(id);
  if (!source) return null;

  const { id: _id, createdAt: _ca, lastUsed: _lu, ...rest } = source;
  const [cloned] = await db
    .insert(browserProfilesTable)
    .values({
      ...rest,
      name: rest.name ? `${rest.name} (copy)` : undefined,
      status: "idle",
      failureCount: 0,
      failureReason: null,
      needsAttention: false,
      lastValidated: null,
    })
    .returning();
  return cloned ?? null;
}

export async function updateProfile(id: string, data: Partial<InsertBrowserProfile>) {
  const [updated] = await db
    .update(browserProfilesTable)
    .set(data)
    .where(eq(browserProfilesTable.id, id))
    .returning();
  return updated ?? null;
}

export async function updateProfileFingerprint(id: string, fingerprint: BrowserFingerprint) {
  const [updated] = await db
    .update(browserProfilesTable)
    .set({ fingerprint })
    .where(eq(browserProfilesTable.id, id))
    .returning();
  return updated ?? null;
}

export async function updateProfileExtensions(id: string, extensions: unknown[]) {
  const [updated] = await db
    .update(browserProfilesTable)
    .set({ extensions })
    .where(eq(browserProfilesTable.id, id))
    .returning();
  return updated ?? null;
}

export async function importProfileCookies(id: string, cookies: unknown[]) {
  const [updated] = await db
    .update(browserProfilesTable)
    .set({ cookies, lastValidated: new Date() })
    .where(eq(browserProfilesTable.id, id))
    .returning();
  return updated ?? null;
}
