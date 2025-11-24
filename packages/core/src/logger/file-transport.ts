import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { CONFIG_DIR_NAME, LOG_DIR_NAME } from "@repo/shared";

export interface LogEntry {
  type: string;
  message: string;
  timestamp: Date;
  args?: unknown[];
}

/**
 * Get the log directory path
 */
export function getLogDir(): string {
  return join(homedir(), ".config", CONFIG_DIR_NAME, LOG_DIR_NAME);
}

/**
 * Get today's log file path
 */
export function getLogFilePath(): string {
  const date = new Date().toISOString().split("T")[0];
  return join(getLogDir(), `${date}.log`);
}

/**
 * Format a log entry for file output
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const level = entry.type.toUpperCase().padEnd(5);
  const args = entry.args?.length
    ? " " + entry.args.map((a) => JSON.stringify(a)).join(" ")
    : "";

  return `[${timestamp}] [${level}] ${entry.message}${args}\n`;
}

/**
 * Create a file transport for logging
 */
export function createFileTransport() {
  let initialized = false;
  const logDir = getLogDir();
  const logFile = getLogFilePath();

  async function ensureLogDir(): Promise<void> {
    if (!initialized) {
      try {
        await mkdir(logDir, { recursive: true });
        initialized = true;
      } catch {
        // Silently fail - logging shouldn't crash the app
      }
    }
  }

  return {
    async log(entry: LogEntry): Promise<void> {
      try {
        await ensureLogDir();
        const line = formatLogEntry(entry);
        await appendFile(logFile, line, "utf-8");
      } catch {
        // Silently fail - logging shouldn't crash the app
      }
    },
  };
}
