import {
  ActivityType,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Events,
  REST as DiscordRestClient,
  Routes,
} from "discord.js";
import { inject, injectable } from "inversify";
import { CommandsHandler } from "../handlers/command";
import { TYPES } from "../types";
import { Logger } from "../utils";

@injectable()
export class MusicBot {
  private logger: Logger;
  private discordClient: Client;
  private discordRestClient: DiscordRestClient;
  private commandsHandler: CommandsHandler;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.DiscordClient) discordClient: Client,
    @inject(TYPES.CommandsHandler) commandsHandler: CommandsHandler
  ) {
    this.logger = logger;
    this.discordClient = discordClient;
    this.commandsHandler = commandsHandler;
    this.discordRestClient = new DiscordRestClient().setToken(
      process.env.DISCORD_ACCESS_TOKEN
    );
    this.addClientEventHandlers();
  }

  public async startBot(): Promise<void> {
    try {
      const commands = this.commandsHandler.getSlashCommands();

      this.discordClient.login(process.env.DISCORD_ACCESS_TOKEN);

      this.discordRestClient
        .put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
          body: commands,
        })
        .then((data: any) => {
          this.logger.info(
            `Successfully registered ${data.length} global application (/) commands`
          );
        })
        .catch((err) => {
          this.logger.error(err);
        });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async health(): Promise<any> {
    const { readyTimestamp, uptime, isReady } = this.discordClient;

    return {
      time: Date.now(),
      readyTime: readyTimestamp,
      uptime: uptime,
    };
  }

  public async destroy() {
    this.discordClient.destroy();
  }

  addClientEventHandlers() {
    this.discordClient.on(Events.InteractionCreate, (interaction) => {
      this.commandsHandler
        .handleInteraction(
          interaction as ChatInputCommandInteraction | ButtonInteraction
        )
        .catch((err) => this.logger.error(err));
    });

    this.discordClient.on(Events.ClientReady, () => {
      this.logger.info("Overseer music bot client logged in");
      this.discordClient.user.setActivity("over you", {
        type: ActivityType.Watching,
      });
    });

    this.discordClient.on(Events.ShardReconnecting, () => {
      this.logger.info("Overseer music bot client reconnecting");
    });

    this.discordClient.on(Events.ShardDisconnect, () => {
      this.logger.info("Overseer music bot disconnect");
    });
  }
}
