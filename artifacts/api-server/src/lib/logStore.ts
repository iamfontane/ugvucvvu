export interface LogEntry {
  id: number;
  ts: number;
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  msg: string;
  context?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
const store: LogEntry[] = [];
let seq = 0;

export function pushLog(entry: Omit<LogEntry, "id">): void {
  seq++;
  store.push({ id: seq, ...entry });
  if (store.length > MAX_ENTRIES) store.shift();
}

export function getLogs(since?: number, limit = 100): LogEntry[] {
  const bounded = Math.min(limit, MAX_ENTRIES);
  if (since !== undefined) {
    const filtered = store.filter((e) => e.id > since);
    return filtered.slice(-bounded);
  }
  return store.slice(-bounded);
}
