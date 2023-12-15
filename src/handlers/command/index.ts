import {
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
} from "discord.js";
import { inject, injectable } from "inversify";
import { PauseCommand } from "../../commands/pause";
import PlayCommand from "../../commands/play";
import { QueueCommand } from "../../commands/queue";
import { ResumeCommand } from "../../commands/resume";
import { SkipCommand } from "../../commands/skip";
import IOCContainer from "../../inversify.config";
import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { Logger } from "../../utils";

@injectable()
export class CommandsHandler {
  private commands: Command[] = [
    IOCContainer.get<PlayCommand>(TYPES.PlayCommand),
    IOCContainer.get<SkipCommand>(TYPES.SkipCommand),
    IOCContainer.get<PauseCommand>(TYPES.PauseCommand),
    IOCContainer.get<ResumeCommand>(TYPES.ResumeCommand),
    IOCContainer.get<QueueCommand>(TYPES.QueueCommand),
  ];
  private logger: Logger;
  private discordClient: Client;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.DiscordClient) discordClient
  ) {
    this.logger = logger;
    this.discordClient = discordClient;
  }

  async handleInteraction(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const matchedCommand = this.commands.find((command) =>
      command.commandNames.includes(interaction.commandName)
    );

    if (!matchedCommand) {
      return Promise.reject("Command not matched");
    }

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

    if (matchedCommand.execute) {
      matchedCommand
        .execute(interaction)
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
