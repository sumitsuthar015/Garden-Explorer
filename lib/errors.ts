import { ZodError } from "zod";

/**
 * Reusable error + logging utilities.
 *
 * Rules enforced here:
 *  - Visitors never see database/technical details.
 *  - Server logs always carry a machine-readable code plus safe context.
 *  - Secrets are never logged.
 */

export const ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "QR_NOT_FOUND",
  "QR_INACTIVE",
  "LOCATION_UNAVAILABLE",
  "TRAIL_UNAVAILABLE",
  "QUIZ_INVALID",
  "UPLOAD_FAILED",
  "CONFIG_MISSING",
  "DATABASE_ERROR",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Log codes mirror the spec's structured logging vocabulary. */
export const LOG_CODES = [
  "QR_RESOLUTION_FAILED",
  "LOCATION_FETCH_FAILED",
  "TRAIL_FETCH_FAILED",
  "QUIZ_SUBMISSION_FAILED",
  "ACTIVITY_SUBMISSION_FAILED",
  "MEDIA_UPLOAD_FAILED",
  "ADMIN_PERMISSION_DENIED",
  "AUTH_FAILED",
  "DATABASE_ERROR",
  "ANALYTICS_WRITE_FAILED",
  "UNEXPECTED_ERROR",
] as const;
export type LogCode = (typeof LOG_CODES)[number];

const VISITOR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: "Something went wrong. Please try again.",
  VALIDATION_FAILED: "Some details need checking. Please review and try again.",
  UNAUTHORIZED: "You need to sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That already exists. Please use a different value.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  QR_NOT_FOUND: "This QR code is not recognized.",
  QR_INACTIVE: "This learning point is currently inactive.",
  LOCATION_UNAVAILABLE: "This learning point isn't available right now.",
  TRAIL_UNAVAILABLE: "This trail isn't available right now.",
  QUIZ_INVALID: "This quiz isn't available right now.",
  UPLOAD_FAILED: "We couldn't upload that file.",
  CONFIG_MISSING: "This feature isn't configured on this garden yet.",
  DATABASE_ERROR: "We couldn't load this learning point.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  QR_NOT_FOUND: 404,
  QR_INACTIVE: 410,
  LOCATION_UNAVAILABLE: 404,
  TRAIL_UNAVAILABLE: 404,
  QUIZ_INVALID: 422,
  UPLOAD_FAILED: 422,
  CONFIG_MISSING: 503,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

/** Fields surfaced to a *signed-in admin*. Never returned to visitors. */
export type AppErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly logCode: LogCode;
  readonly status: number;
  readonly cause?: unknown;
  /** Safe, admin-only field errors. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    options: {
      logCode?: LogCode;
      message?: string;
      cause?: unknown;
      fieldErrors?: Record<string, string[]>;
    } = {},
  ) {
    super(options.message ?? VISITOR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.logCode = options.logCode ?? "UNEXPECTED_ERROR";
    this.status = HTTP_STATUS_BY_CODE[code];
    this.cause = options.cause;
    this.fieldErrors = options.fieldErrors;
  }

  /** Message that is always safe to render to an anonymous visitor. */
  get visitorMessage(): string {
    return VISITOR_MESSAGES[this.code] ?? VISITOR_MESSAGES.INTERNAL_ERROR;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Wrap unknown thrown values into an AppError without leaking details. */
export function toAppError(error: unknown, logCode: LogCode = "UNEXPECTED_ERROR"): AppError {
  if (isAppError(error)) return error;
  if (error instanceof ZodError) {
    return new AppError("VALIDATION_FAILED", { cause: error, logCode });
  }
  return new AppError("INTERNAL_ERROR", { cause: error, logCode });
}

type LogFields = Record<string, unknown>;

/**
 * Structured server-side logging. Always emits a single JSON line so Vercel
 * log drains can parse it. Never pass secrets in `fields`.
 */
export function logServerEvent(
  level: "info" | "warn" | "error",
  code: LogCode,
  fields: LogFields = {},
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    code,
    ...fields,
  };

  let line: string;
  try {
    line = JSON.stringify(payload);
  } catch {
    line = `{"level":"${level}","code":"${code}","serializationError":true}`;
  }

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Discriminated result used by server actions so UIs get typed outcomes. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(error: unknown, logCode: LogCode = "UNEXPECTED_ERROR"): ActionResult<never> {
  const appError = toAppError(error, logCode);
  if (appError.code === "INTERNAL_ERROR" || appError.code === "DATABASE_ERROR") {
    logServerEvent("error", appError.logCode, {
      errorCode: appError.code,
      detail: appError.cause instanceof Error ? appError.cause.message : String(appError.cause),
    });
  }
  return {
    ok: false,
    code: appError.code,
    message: appError.visitorMessage,
    fieldErrors: appError.fieldErrors,
  };
}
