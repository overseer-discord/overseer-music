import {
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
  VoiceBasedChannel,
} from "discord.js";
import { inject, injectable } from "inversify";
import IOCContainer from "../../../inversify.config";
import { PauseCommand } from "../../commands/pause";
import PlayCommand from "../../commands/play";
import { QueueCommand } from "../../commands/queue";
import { ResumeCommand } from "../../commands/resume";
import { SkipCommand } from "../../commands/skip";
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

  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger;
  }

  async handleInteraction(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const matchedCommand = this.commands.find((command) =>
      command.commandNames.includes(interaction.commandName)
    );

    if (!matchedCommand) {
      throw new Error("Command not matched");
    }

    const client = IOCContainer.get<Client>(TYPES.DiscordClient);
    const guild = client.guilds.cache.get(interaction.guildId);
    const member = await guild.members.fetch(interaction.member.user.id);
    const voiceChannel: VoiceBasedChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply(
        "You need to be in a voice channel to play music!"
      );
      return;
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);

    if (
      !permissions.has(PermissionFlagsBits.Connect) ||
      !permissions.has(PermissionFlagsBits.Speak)
    ) {
      await interaction.reply(
        "I need the permissions to join and speak in your voice channel!"
      );
      return;
    }

    if (matchedCommand.execute) {
      try {
        await matchedCommand.execute(interaction);
      } catch (err) {
        this.logger.error(err);
      }
    }
  }

  getSlashCommands() {
    const commands = this.commands
      .map((command) => {
        if (command.slashCommandConfig) {
          return command.slashCommandConfig.toJSON();
        }
      })
      .filter((el) => el !== undefined);
    return commands;
  }
}
