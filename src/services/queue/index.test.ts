import "reflect-metadata";

import { GuildQueueService } from ".";
import { ServerQueue } from "../../models/queue";
import { Logger } from "../../utils";

describe("Queue service test", () => {
  let guildQueueService: GuildQueueService;

  beforeEach(() => {
    guildQueueService = new GuildQueueService(new Logger());
  });

  it("Should get the guild queue", () => {
    const newServerQueue: ServerQueue = {
      textChannel: null,
      voiceChannel: null,
      connection: null,
      player: null,
      songs: [],
      songPosition: 0,
      volume: 5,
      playing: true,
    };

    guildQueueService.addGuildQueue("111", newServerQueue);

    expect(guildQueueService.getGuildQueue("123456")).toBeNull();
    expect(guildQueueService.getGuildQueue("111")).toBeDefined();
  });

  it("Should delete the guild queue", () => {
    const newServerQueue: ServerQueue = {
      textChannel: null,
      voiceChannel: null,
      connection: null,
      player: null,
      songs: [],
      songPosition: 0,
      volume: 5,
      playing: true,
    };

    guildQueueService.addGuildQueue("222", newServerQueue);
    expect(guildQueueService.getGuildQueue("222")).toBeDefined();

    guildQueueService.removeGuildQueue("222");
    expect(guildQueueService.getGuildQueue("222")).toBeNull();
  });
});
