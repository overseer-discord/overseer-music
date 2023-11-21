import {
  ChatInputCommandInteraction,
  Client,
  Events,
  REST,
  Routes,
} from "discord.js";
import { inject, injectable } from "inversify";
import { CommandHandler } from "../handlers/command";
import { TYPES } from "../types";
import { Logger } from "../utils";

@injectable()
export class MusicBot {
  private logger: Logger;
  private discordClient: Client;
  private discordRestClient: REST;
  private commandHandler: CommandHandler;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.DiscordClient) discordClient: Client,
    @inject(TYPES.CommandHandler) commandHandler: CommandHandler
  ) {
    this.logger = logger;
    this.discordClient = discordClient;
    this.commandHandler = commandHandler;
    this.discordRestClient = new REST().setToken(process.env.TOKEN);
  }

  public async start(): Promise<void> {
    try {
      this.addEventHandlers();

      console.log(process.env.CLIENT_ID);
      const commands = this.commandHandler.getSlashCommands();
      const data: any = await this.discordRestClient.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          "416126681976143899"
        ),
        { body: commands }
      );

      this.logger.info(
        `Successfully reloaded ${data.length} application (/) commands.`
      );

      this.discordClient.login(process.env.DISCORD_ACCESS_TOKEN);
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  public async destroy() {
    this.discordClient.destroy();
  }

  addEventHandlers() {
    this.discordClient.on(Events.InteractionCreate, (interaction) => {
      this.commandHandler
        .handleInteraction(interaction as ChatInputCommandInteraction)
        .catch((err) => this.logger.error(err));
    });

    this.discordClient.on(Events.ClientReady, () => {
      this.logger.info("Overseer music bot client logged in");
    });

    this.discordClient.on("reconnecting", () => {
      this.logger.info("Overseer music bot client reconecting");
    });

    this.discordClient.on("disconnect", () => {
      this.logger.info("Overseer music bot disconnect");
    });
  }
}
