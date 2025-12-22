import { AppError } from "./app-error";

export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return new AppError(message, 500);
};
