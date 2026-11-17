export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "upstream"
  | "config";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}