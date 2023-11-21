import {
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
    @inject(TYPES.CommandHandler) commandHandler: CommandsHandler
  ) {
    this.logger = logger;
    this.discordClient = discordClient;
    this.commandsHandler = commandHandler;
    this.discordRestClient = new DiscordRestClient().setToken(
      process.env.TOKEN
    );
  }

  public async start(): Promise<void> {
    try {
      this.addClientEventHandlers();

      const commands = this.commandsHandler.getSlashCommands();

      this.discordClient.login(process.env.DISCORD_ACCESS_TOKEN);
      const guilds = await this.discordClient.guilds.fetch();

      guilds.forEach((guild) => {
        this.discordRestClient
          .put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
            { body: commands }
          )
          .then((data: any) => {
            this.logger.info(
              `Successfully reloaded ${data.length} application (/) commands to the ${guild.name} server`
            );
          })
          .catch((err) => {
            this.logger.error(err);
          });
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async destroy() {
    this.discordClient.destroy();
  }

  addClientEventHandlers() {
    this.discordClient.on(Events.InteractionCreate, (interaction) => {
      this.commandsHandler
        .handleInteraction(interaction as ChatInputCommandInteraction)
        .catch((err) => this.logger.error(err));
    });

    this.discordClient.on(Events.ClientReady, () => {
      this.logger.info("Overseer music bot client logged in");
    });

    this.discordClient.on(Events.ShardReconnecting, () => {
      this.logger.info("Overseer music bot client reconnecting");
    });

    this.discordClient.on(Events.ShardDisconnect, () => {
      this.logger.info("Overseer music bot disconnect");
    });
  }
}
