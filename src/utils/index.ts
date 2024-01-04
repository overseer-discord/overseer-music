import { injectable } from "inversify";
import { pino, Logger as PinoLogger } from "pino";

interface LogInterface {
  debug(primaryMessage: string, ...supportingData: any[]): void;
  warn(primaryMessage: string, ...supportingData: any[]): void;
  error(primaryMessage: string, ...supportingData: any[]): void;
  info(primaryMessage: string, ...supportingData: any[]): void;
}

@injectable()
export class Logger implements LogInterface {
  private logger: PinoLogger;

  constructor() {
    this.logger = pino({
      name: "overseer-music",
    });
  }

  debug(message: string, ...supportingData: any[]): void {
    this.logger.debug(message, supportingData);
  }

  error(message: string, ...supportingData: any[]): void {
    this.logger.error(message, supportingData);
  }

  info(message: string, obj?: any, ...supportingData: any[]): void {
    this.logger.info(obj, message, supportingData);
  }

  warn(message: string, ...supportingData: any[]): void {
    this.logger.warn(message, supportingData);
  }
}

export function truncateString(str: string, length: number) {
  if (str.length > length) {
    return str.slice(0, length) + "...";
  } else return str;
}

export function formatSecondsToReadableTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedTime = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

  return formattedTime;
}
