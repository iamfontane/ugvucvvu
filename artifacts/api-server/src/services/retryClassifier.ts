export type ErrorType =
  | "network"
  | "timeout"
  | "invalid_credentials"
  | "captcha"
  | "banned"
  | "invalid_session"
  | "unknown";

export interface ClassifiedError {
  type: ErrorType;
  recoverable: boolean;
  message: string;
}

const RECOVERABLE_TYPES: ErrorType[] = ["network", "timeout", "unknown"];
const MAX_FAILURES_BEFORE_ATTENTION = 3;

/**
 * Classify a raw error into a structured error type.
 */
export function classifyError(err: unknown, workflowReason?: string): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const combined = [msg, workflowReason].filter(Boolean).join(" ").toLowerCase();

  if (workflowReason && ["invalid_credentials", "captcha", "banned"].includes(workflowReason)) {
    return {
      type: workflowReason as ErrorType,
      recoverable: false,
      message: workflowReason,
    };
  }

  if (combined.includes("net::") || combined.includes("econnrefused") || combined.includes("enotfound")) {
    return { type: "network", recoverable: true, message: "Network error: " + msg };
  }
  if (combined.includes("timeout") || combined.includes("timed out")) {
    return { type: "timeout", recoverable: true, message: "Timeout: " + msg };
  }
  if (combined.includes("invalid login") || combined.includes("incorrect password") || combined.includes("wrong password")) {
    return { type: "invalid_credentials", recoverable: false, message: msg };
  }
  if (combined.includes("captcha") || combined.includes("recaptcha") || combined.includes("challenge")) {
    return { type: "captcha", recoverable: false, message: "CAPTCHA/challenge required" };
  }
  if (combined.includes("banned") || combined.includes("suspended") || combined.includes("disabled")) {
    return { type: "banned", recoverable: false, message: "Account may be banned/suspended" };
  }
  if (combined.includes("invalid session") || combined.includes("logged out") || combined.includes("session expired")) {
    return { type: "invalid_session", recoverable: true, message: "Session expired" };
  }

  return { type: "unknown", recoverable: true, message: msg };
}

/**
 * Compute exponential backoff delay in milliseconds.
 */
export function getBackoffDelay(failureCount: number): number {
  const base = 10_000;
  const max = 300_000;
  const delay = Math.min(base * Math.pow(2, failureCount), max);
  const jitter = Math.floor(Math.random() * 5000);
  return delay + jitter;
}

/**
 * Determine if a profile should be flagged for attention.
 */
export function shouldFlagForAttention(failureCount: number): boolean {
  return failureCount >= MAX_FAILURES_BEFORE_ATTENTION;
}

/**
 * Determine if job should be retried based on error type and failure count.
 */
export function shouldRetry(classified: ClassifiedError, failureCount: number): boolean {
  if (!classified.recoverable) return false;
  if (failureCount >= MAX_FAILURES_BEFORE_ATTENTION) return false;
  return true;
}
