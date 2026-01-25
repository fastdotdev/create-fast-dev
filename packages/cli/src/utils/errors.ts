/**
 * Error formatting utilities for user-friendly CLI error messages
 */

export interface ErrorContext {
  template?: string;
}

/**
 * Formats an error into a user-friendly message without stack traces
 */
export function formatError(error: unknown, context?: ErrorContext): string {
  const message = error instanceof Error ? error.message : String(error);

  // 404 - Template/repo not found
  if (message.includes("404") || message.includes("Not Found")) {
    return context?.template
      ? `Template "${context.template}" not found. Run \`create-fast-dev list\` to see available templates.`
      : "Template not found. The repository may not exist or is private.";
  }

  // Network errors
  if (
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("fetch failed") ||
    message.includes("getaddrinfo")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Permission errors
  if (message.includes("EACCES") || message.includes("EPERM")) {
    return "Permission denied. Check that you have write access to the target directory.";
  }

  // Directory exists
  if (message.includes("EEXIST")) {
    return "Directory already exists. Choose a different project name or remove the existing directory.";
  }

  // Git clone errors
  if (message.includes("git clone") || message.includes("fatal:")) {
    if (message.includes("not found") || message.includes("does not exist")) {
      return context?.template
        ? `Template "${context.template}" repository not found.`
        : "Repository not found. Check that the template exists.";
    }
    return "Failed to clone template repository. Check your git configuration.";
  }

  // Fallback - return first line only, no stack trace
  const firstLine = message.split("\n")[0];
  return firstLine || "An unexpected error occurred.";
}
