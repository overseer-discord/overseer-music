import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
} from "discord.js";
import { inject, injectable } from "inversify";
import { JumpCommand } from "../../commands/jump";
import { MoveCommand } from "../../commands/move";
import NowPlayingCommand from "../../commands/nowplaying";
import { PauseCommand } from "../../commands/pause";
import PlayCommand from "../../commands/play";
import { PreviousCommand } from "../../commands/previous";
import { QueueCommand } from "../../commands/queue";
import { ResumeCommand } from "../../commands/resume";
import { SkipCommand } from "../../commands/skip";
import IOCContainer from "../../inversify.config";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { Logger } from "../../utils";

@injectable()
export class CommandsHandler {
  private commands: Command[] = [];
  private logger: Logger;
  private discordClient: Client;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.DiscordClient) discordClient
  ) {
    const commandClasses = [
      PlayCommand,
      SkipCommand,
      PreviousCommand,
      PauseCommand,
      ResumeCommand,
      QueueCommand,
      NowPlayingCommand,
      JumpCommand,
      MoveCommand,
    ];

    this.commands = commandClasses.map((commandClass) =>
      IOCContainer.get<Command>(TYPES[commandClass.name as keyof typeof TYPES])
    );

    this.logger = logger;
    this.discordClient = discordClient;
  }

  async handleInteraction(
    interaction: ChatInputCommandInteraction | ButtonInteraction
  ): Promise<void> {
    const guild = this.discordClient.guilds.cache.get(interaction.guildId);
    const member = await guild.members.fetch(interaction.member.user.id);

    const { channel: voiceChannel } = member.voice;

    if (!voiceChannel) {
      await interaction.reply(
        "You need to be in a voice channel to play music!"
      );

      return Promise.reject(
        "Member needs to be in a voice chanel to use bot commands"
      );
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);

    if (
      !permissions.has(PermissionFlagsBits.Connect) ||
      !permissions.has(PermissionFlagsBits.Speak)
    ) {
      await interaction.reply(
        "I need the permissions to join and speak in your voice channel!"
      );

      return Promise.reject(
        "Bot does not have required permissions to join voice channel"
      );
    }

    let commandName;
    const isMessageComponent = interaction.isMessageComponent();

    if (isMessageComponent) {
      commandName = interaction.message.interaction.commandName;
    } else {
      commandName = interaction.commandName;
    }

    const matchedCommand = this.commands.find((command) =>
      command.commandNames.includes(commandName)
    );

    if (!matchedCommand) {
      return Promise.reject("Command not matched");
    }

    if (!isMessageComponent && matchedCommand.execute) {
      matchedCommand
        .execute(interaction)
        .then(() => {
          this.logger.info(`Executing command [/${interaction.commandName}]`, {
            guild: { id: interaction.guildId, name: interaction.guild.name },
            user: { name: interaction.user.globalName },
          });
        })
        .catch((err) =>
          this.logger.error(
            `Error executing command [/${interaction.commandName}]: ${err}`,
            {
              guild: { id: interaction.guildId, name: interaction.guild.name },
              user: { name: interaction.user.globalName },
            }
          )
        );
    } else if (isMessageComponent && matchedCommand.handleMessageComponent) {
      matchedCommand
        .handleMessageComponent(interaction)
        .catch((err) => this.logger.error(err));
    }
  }

  getSlashCommands() {
    const commands = this.commands
      .map((command: Command) => {
        if (command.slashCommandConfig) {
          return command.slashCommandConfig.toJSON();
        }
      })
      .filter((el) => el !== undefined);
    return commands;
  }
}
