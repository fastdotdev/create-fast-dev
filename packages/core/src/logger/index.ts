import { createConsola } from "consola";

import { createFileTransport } from "./file-transport.js";

export interface LoggerOptions {
  /** Enable debug level logging */
  debug?: boolean;
  /** Enable file logging */
  fileLogging?: boolean;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
}

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const fileTransport = options.fileLogging !== false ? createFileTransport() : null;

  const consola = createConsola({
    level: options.debug ? 4 : 3, // 4 = debug, 3 = info
  });

  function wrapMethod(
    method: (...args: unknown[]) => void,
    type: string
  ): (...args: unknown[]) => void {
    return (...args: unknown[]) => {
      // Log to console
      method(...args);

      // Log to file
      if (fileTransport) {
        const message = args
          .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
          .join(" ");

        fileTransport.log({
          type,
          message,
          timestamp: new Date(),
          args: args.length > 1 ? args.slice(1) : undefined,
        });
      }
    };
  }

  return {
    debug: wrapMethod(consola.debug.bind(consola), "debug"),
    info: wrapMethod(consola.info.bind(consola), "info"),
    warn: wrapMethod(consola.warn.bind(consola), "warn"),
    error: wrapMethod(consola.error.bind(consola), "error"),
    success: wrapMethod(consola.success.bind(consola), "success"),
  };
}

export { getLogDir, getLogFilePath } from "./file-transport.js";
