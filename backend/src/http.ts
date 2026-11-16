import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";

/**
 * Throw an HttpError from any route or service to send `{ error, ...extra }`
 * with that status. The error handler at the bottom of index.ts does the rest.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

/** Validates `data` against `schema`, or throws a 400 that names the first problem */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) throw result.error;
  return result.data;
}

/** Last middleware: turns thrown errors into JSON responses */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...err.extra });
    return;
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue.path.join(".");
    res.status(400).json({ error: field ? `${field}: ${issue.message}` : issue.message });
    return;
  }
  // Malformed JSON body
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body isn't valid JSON." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}
