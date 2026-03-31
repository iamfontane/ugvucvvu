import pino from "pino";
import { Writable } from "stream";
import { pushLog, type LogEntry } from "./logStore.js";

const LEVEL_MAP: Record<number, LogEntry["level"]> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

const captureStream = new Writable({
  write(chunk, _enc, cb) {
    try {
      const line = chunk.toString().trim();
      if (line) {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const level = LEVEL_MAP[parsed["level"] as number] ?? "info";
        const msg = (parsed["msg"] as string) ?? "";
        const { level: _l, msg: _m, time: _t, pid: _p, hostname: _h, v: _v, ...context } = parsed;
        pushLog({
          ts: Date.now(),
          level,
          msg,
          context: Object.keys(context).length ? context : undefined,
        });
      }
    } catch {
    }
    cb();
  },
});

const isProduction = process.env.NODE_ENV === "production";

const streams: pino.StreamEntry[] = [
  { stream: captureStream },
  { stream: process.stdout },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    ...(isProduction
      ? {}
      : {
          transport: undefined,
        }),
  },
  pino.multistream(streams),
);
