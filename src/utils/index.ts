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
      name: "app-name",
    });
  }

  debug(message: string, ...supportingData: any[]): void {
    this.logger.debug(message, supportingData);
  }

  error(message: string, ...supportingData: any[]): void {
    this.logger.error(message, supportingData);
  }

  info(message: string, ...supportingData: any[]): void {
    this.logger.info(message, supportingData);
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
