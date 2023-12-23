import { inject, injectable } from "inversify";
import { ServerQueue } from "../../models/queue";
import { TYPES } from "../../types";
import { Logger } from "../../utils";

@injectable()
export class GuildQueueService {
  private queue;
  private logger: Logger;

  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger;
    //TODO: Find better way to persist Guild queues
    this.queue = new Map<number, ServerQueue>();
  }

  public getGuildQueue(guildId: string): ServerQueue {
    return this.queue.get(guildId) || null;
  }

  public addGuildQueue(guildId: string, queue: ServerQueue): void {
    return this.queue.set(guildId, queue);
  }

  public removeGuildQueue(guildId: string): void {
    return this.queue.delete(guildId);
  }
}
