import { useEffect, useRef, useState } from "react";
import { Terminal, Circle, Maximize2, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogEntry {
  id: number;
  ts: number;
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  msg: string;
  context?: Record<string, unknown>;
}

const LEVEL_STYLES: Record<string, string> = {
  trace: "text-zinc-500",
  debug: "text-zinc-400",
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-rose-400",
  fatal: "text-rose-600 font-bold",
};

const LEVEL_BADGE: Record<string, string> = {
  trace: "text-zinc-500",
  debug: "text-zinc-400",
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-rose-400",
  fatal: "text-rose-600",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function LogLines({ entries }: { entries: LogEntry[] }) {
  return (
    <>
      {entries.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          Waiting for log entries...
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="flex gap-2 leading-5 group hover:bg-white/5 rounded px-1 -mx-1">
            <span className="text-zinc-600 shrink-0 tabular-nums">{formatTime(entry.ts)}</span>
            <span className={cn("uppercase w-[38px] shrink-0 font-bold tabular-nums", LEVEL_BADGE[entry.level])}>
              {entry.level.slice(0, 4)}
            </span>
            <span className={cn("break-all", LEVEL_STYLES[entry.level])}>
              {entry.msg}
              {entry.context && Object.keys(entry.context).length > 0 && (
                <span className="text-zinc-600 ml-1 group-hover:text-zinc-500">
                  {Object.entries(entry.context)
                    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
                    .join(" ")}
                </span>
              )}
            </span>
          </div>
        ))
      )}
    </>
  );
}

function LogHeader({
  connected,
  hasEntries,
  onClear,
  onFullView,
  onClose,
  fullView = false,
}: {
  connected: boolean;
  hasEntries: boolean;
  onClear: () => void;
  onFullView?: () => void;
  onClose?: () => void;
  fullView?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 shrink-0">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary shrink-0" />
        <h2 className="text-sm sm:text-base font-display font-bold text-foreground">Live Logs</h2>
      </div>
      <div className="flex items-center gap-2">
        <Circle
          className={cn(
            "w-2.5 h-2.5 fill-current",
            connected ? "text-emerald-400 animate-pulse" : "text-rose-400",
          )}
        />
        <span className={cn("text-xs font-medium", connected ? "text-emerald-400" : "text-rose-400")}>
          {connected ? "Live" : "Offline"}
        </span>
        {!fullView && onFullView && (
          <button
            onClick={onFullView}
            title="Full view"
            className="ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border/50 hover:border-border"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Full View</span>
          </button>
        )}
        {hasEntries && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border/50 hover:border-border"
          >
            Clear
          </button>
        )}
        {fullView && onClose && (
          <button
            onClick={onClose}
            className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function LiveLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [fullView, setFullView] = useState(false);
  const lastIdRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fullBottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const url = `${BASE_URL}/api/logs/live?since=${lastIdRef.current}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("non-ok");
        const data = (await res.json()) as { entries: LogEntry[] };
        if (active) {
          setConnected(true);
          if (data.entries.length > 0) {
            setEntries((prev) => {
              const existingIds = new Set(prev.map((e) => e.id));
              const newEntries = data.entries.filter((e) => !existingIds.has(e.id));
              if (newEntries.length === 0) return prev;
              return [...prev, ...newEntries].slice(-500);
            });
            lastIdRef.current = data.entries[data.entries.length - 1]!.id;
          }
        }
      } catch {
        if (active) setConnected(false);
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      const fel = fullContainerRef.current;
      if (fel) fel.scrollTop = fel.scrollHeight;
    }
  }, [entries, autoScroll]);

  // Lock body scroll and handle Escape key when full view is open
  useEffect(() => {
    if (fullView) {
      document.body.style.overflow = "hidden";
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullView(false); };
      window.addEventListener("keydown", handler);
      return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handler); };
    } else {
      document.body.style.overflow = "";
    }
  }, [fullView]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  function handleFullScroll() {
    const el = fullContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  function handleClear() {
    setEntries([]);
    lastIdRef.current = 0;
  }

  return (
    <>
      {/* Compact inline view */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden border-border/50 flex flex-col" style={{ height: "360px" }}>
        <LogHeader
          connected={connected}
          hasEntries={entries.length > 0}
          onClear={handleClear}
          onFullView={() => setFullView(true)}
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto font-mono text-xs p-3 sm:p-4 space-y-0.5 bg-black/20"
        >
          <LogLines entries={entries} />
          <div ref={bottomRef} />
        </div>
        {!autoScroll && (
          <div className="shrink-0 flex justify-center py-1.5 border-t border-border/50">
            <button
              onClick={() => {
                setAutoScroll(true);
                const el = containerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="text-xs text-primary hover:underline"
            >
              ↓ Scroll to bottom
            </button>
          </div>
        )}
      </div>

      {/* Full-view modal overlay */}
      {fullView && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
          <div className="flex flex-col h-full max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden border-border/50 flex flex-col flex-1 min-h-0">
              <LogHeader
                connected={connected}
                hasEntries={entries.length > 0}
                onClear={handleClear}
                onClose={() => setFullView(false)}
                fullView
              />
              <div
                ref={fullContainerRef}
                onScroll={handleFullScroll}
                className="flex-1 overflow-y-auto font-mono text-xs p-4 sm:p-6 space-y-0.5 bg-black/20"
              >
                <LogLines entries={entries} />
                <div ref={fullBottomRef} />
              </div>
              {!autoScroll && (
                <div className="shrink-0 flex justify-center py-1.5 border-t border-border/50">
                  <button
                    onClick={() => {
                      setAutoScroll(true);
                      const fel = fullContainerRef.current;
                      if (fel) fel.scrollTop = fel.scrollHeight;
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    ↓ Scroll to bottom
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{entries.length} log entries (last 500 kept)</span>
              <button onClick={() => setFullView(false)} className="hover:text-foreground transition-colors">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Esc</kbd> to close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
