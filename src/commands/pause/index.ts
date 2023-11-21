import { Command } from "../../models/command";
import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { PlayerService } from "../../services/player";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

@injectable()
export class PauseCommand implements Command {
  private playerService: PlayerService;

  slashCommandConfig;
  commandNames = ["pause"];

  constructor(@inject(TYPES.PlayerService) playerService: PlayerService) {
    this.playerService = playerService;
    this.slashCommandConfig = new SlashCommandBuilder()
      .setName(this.commandNames[0])
      .setDescription("Pause the currently playing song");
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    await this.playerService.pauseSong({
      guildId: interaction.guild.id,
    });

    await interaction.deleteReply();
  }
}
